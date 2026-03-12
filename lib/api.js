import https from 'https';
import fs from 'fs';

import Spotified from 'spotified';
import open from 'open';
import express from 'express';
import puppeteer from 'puppeteer';

import Config from '../config.js';
import Constants from '../util/constants.js';
import { logInfo, logFailure } from '../util/log-helper.js';
import { ensureSelfSignedCertificate } from '../util/cert-generator.js';

import { cliInputs } from './setup.js';

const {
  spotifyApi: { clientId, clientSecret },
} = Config;

const {
  AUTH: {
    SCOPES: {
      USERS_SAVED_PLAYLISTS,
      USERS_SAVED_TRACKS_ALBUMS,
      USERS_TOP_TRACKS,
    },
    STATE,
    REFRESH_ACCESS_TOKEN_SECONDS,
    TIMEOUT_RETRY,
  },
  INPUT_TYPES,
  MAX_LIMIT_DEFAULT,
  SERVER: { PORT, HOST, CALLBACK_URI },
} = Constants;

const redirectUri = `https://${HOST}:${PORT}${CALLBACK_URI}`;

const spotifyApi = new Spotified({
  clientId,
  clientSecret,
});

const scopes = [
  USERS_SAVED_PLAYLISTS,
  USERS_SAVED_TRACKS_ALBUMS,
  USERS_TOP_TRACKS,
];

let nextTokenRefreshTime;
let refreshToken;

const authSetupMessage =
  'Performing Spotify Auth Please Wait... \n' +
  'if you get a 404, please add the following line to /etc/hosts: \n' +
  `127.0.0.1 ${HOST}`;

const hasHostEntry = host => {
  try {
    const hostsFileContent = fs.readFileSync('/etc/hosts', 'utf8');
    const hostEntryPattern = new RegExp(
      `^\\s*127\\.0\\.0\\.1\\s+.*\\b${host.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`,
      'm'
    );

    return hostEntryPattern.test(hostsFileContent);
  } catch {
    return false;
  }
};

Object.defineProperty(Array.prototype, 'chunk', {
  value: function (chunkSize) {
    var R = [];
    for (var i = 0; i < this.length; i += chunkSize) { R.push(this.slice(i, i + chunkSize)); }

    return R;
  },
});

const verifyCredentials = async () => {
  if (!nextTokenRefreshTime || nextTokenRefreshTime < new Date()) {
    nextTokenRefreshTime = new Date();
    nextTokenRefreshTime.setSeconds(
      nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS
    );
    logInfo('Generating new access token');
    await checkCredentials();
  }
};

const checkCredentials = async () => {
  if (refreshToken) {
    await refreshAccessToken();
  } else {
    const { inputs, username, password, login } = cliInputs();

    const requiresLogin = inputs.find(
      input =>
        input.type == INPUT_TYPES.SONG.SAVED_ALBUMS ||
        input.type == INPUT_TYPES.SONG.SAVED_PLAYLISTS ||
        input.type == INPUT_TYPES.SONG.SAVED_TRACKS ||
        input.type == INPUT_TYPES.EPISODE.SAVED_SHOWS
    );

    const requestingLogin = (username && password) || login;

    if (requiresLogin || requestingLogin) {
      await requestAuthorizedTokens();
    } else {
      await requestTokens();
    }
  }
};

const requestAuthorizedTokens = async () => {
  const { username, password } = cliInputs();
  const autoLogin = username.length > 0 && password.length > 0;

  if (!hasHostEntry(HOST)) {
    logInfo(authSetupMessage);
    process.exit(1);
  }

  const app = express();
  let resolve;
  const getCode = new Promise(_resolve => {
    resolve = _resolve;
  });

  app.get(CALLBACK_URI, (req, res) => {
    resolve(req.query.code);
    res.end('');
  });

  const { cert, key } = ensureSelfSignedCertificate(HOST);
  const server = https.createServer({ cert, key }, app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, resolve);
  });

  const authURL = spotifyApi.auth.AuthorizationCode.generateAuthorizationURL(
    redirectUri,
    {
      scope: scopes,
      state: STATE,
      show_dialog: autoLogin,
    }
  );

  let browser = null;

  logInfo('Performing Spotify Auth Please Wait...');

  if (autoLogin) {
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
      ],
    });

    const page = await browser.newPage();
    try {
      await page.goto(authURL.url);
      await page.type('#login-username', username);
      await page.type('#login-password', password);
      await page.click('#login-button');
      await page
        .waitForSelector('#auth-accept, *[data-testid="auth-accept"]')
        .then(e => e.click());
    } catch (e) {
      logFailure(e.message);
      const screenshotPath = './failure.png';
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      throw new Error(
        [
          'Could not generate token',
          'Please find a screenshot of why the auto login failed at ',
          `${screenshotPath}`,
        ].join(' ')
      );
    }
  } else {
    open(authURL.url);
  }

  const code = await getCode;
  setTokens(
    await spotifyApi.auth.AuthorizationCode.requestAccessToken({
      code,
      redirectUri,
    })
  );
  if (browser) {
    browser.close();
  }
  server.close();
};

const requestTokens = async () => {
  setTokens(await spotifyApi.auth.ClientCredentials.requestAccessToken());
};

const refreshAccessToken = async () => {
  setTokens(
    await spotifyApi.auth.AuthorizationCode.refreshAccessToken(refreshToken)
  );
};

const setTokens = tokens => {
  spotifyApi.setBearerToken(tokens['access_token']);
  if (tokens['refresh_token']) {
    refreshToken = tokens['refresh_token'];
  }
};

const getApiErrorStatus = error => {
  if (typeof error?.status === 'number') {
    return error.status;
  }

  if (typeof error?.details?.error?.status === 'number') {
    return error.details.error.status;
  }

  return undefined;
};

const getApiErrorMessage = error => {
  if (typeof error?.message === 'string' && error.message.length > 0) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
// common wrapper for api calls
// to have token verification and api throttling mitigation
const callSpotifyApi = async function (apiCall, allowForbidden = false) {
  const maxRetries = 5;
  let tries = 1;
  let error;

  while (tries <= maxRetries) {
    await verifyCredentials();

    try {
      return await apiCall();
    } catch (e) {
      error = e;
      const status = getApiErrorStatus(e);
      const isRetryable = !status || status == 429 || status >= 500;
      const errorMessage = getApiErrorMessage(e);
      const isForbidden = status == 403;

      if (allowForbidden && isForbidden) {
        logInfo(
          `Spotify API returned forbidden (${status}) for ${apiCall} and was skipped by caller: ${errorMessage}`
        );

        return null;
      }

      if (!isRetryable) {
        logFailure(`Spotify API non-retryable error (${status || 'unknown'}): ${errorMessage}`);
        throw e;
      }

      logInfo(
        `Got a spotify api error (${status || 'unknown'}): ${errorMessage}\n` +
        `Timing out for 5 minutes x ${tries}`
      );
      await new Promise(resolve => setTimeout(resolve, TIMEOUT_RETRY * 1000));
      tries++;
    }
  }
  // if it still fails after all the timeouts and retries throw again
  throw error;
};

export const extractTracks = async (trackIds) => {
  let extractedTracks = [];
  const chunkedTracks = trackIds.chunk(20);
  for (let x = 0; x < chunkedTracks.length; x++) {
    logInfo('extracting track set ' + `${x + 1}/${chunkedTracks.length}`);
    const tracks = await callSpotifyApi(
      async () => (await spotifyApi.track.getSeveralTracks(chunkedTracks[x])).tracks
    );
    extractedTracks.push(...tracks);
  }
  extractedTracks = extractedTracks.filter(x => x);
  const audioFeatures = (
    await extractTrackAudioFeatures(extractedTracks.map(track => track.id))
  ).filter(x => x);

  return extractedTracks.map(track => parseTrack(track, audioFeatures));
};

const parseTrack = (track, audioFeatures) => {
  const audioFeature = audioFeatures.find(
    audioFeature => audioFeature.id == track.id
  );

  return {
    name: track.name,
    bpm: audioFeature ? audioFeature.tempo : undefined,
    popularity: track.popularity,
    artists: track.artists.map(artist => artist.name),
    album_name: track.album.name,
    release_date: track.album.release_date,
    track_number: track.track_number,
    total_tracks: track.album.total_tracks,
    cover_url: track.album.images.map(image => image.url)[0],
    id: track.id,
  };
};

const parseEpisode = (episode, index = 0) => ({
  name: episode.name,
  artists: [episode.show.publisher],
  album_name: episode.show.name,
  release_date: episode.release_date,
  popularity: 100,
  bpm: 0,
  // shows dont have a way to see what episode they are guess via context
  track_number: index,
  total_tracks: episode.show.total_episodes,
  cover_url: episode.images.map(image => image.url)[0],
  id: episode.id,
});

export const extractPlaylist = async (playlistId) => {
  const playlistInfo = await callSpotifyApi(
    async () => await spotifyApi.playlist.getPlaylist(playlistId)
  );
  const tracks = [];
  let playlistData;
  let offset = 0;
  do {
    playlistData = await callSpotifyApi(
      async () =>
        await spotifyApi.playlist.getPlaylistItems(playlistId, {
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${playlistData.total} tracks`);
    }
    tracks.push(...playlistData.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (tracks.length < playlistData.total);
  const audioFeatures = await extractTrackAudioFeatures(
    tracks.map(track => track.id)
  );

  return {
    name: `${playlistInfo.name} - ${playlistInfo.owner.display_name}`,
    items: tracks
      .filter(item => item.track)
      .map(item => parseTrack(item.track, audioFeatures)),
  };
};

export const extractAlbum = async (albumId) => {
  const albumInfo = await callSpotifyApi(
    async () => await spotifyApi.album.getAlbum(albumId)
  );
  const tracks = [];
  let offset = 0;
  let albumTracks;
  do {
    albumTracks = await callSpotifyApi(
      async () =>
        await spotifyApi.album.getAlbumTracks(albumId, {
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${albumTracks.total} tracks`);
    }
    tracks.push(...albumTracks.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (tracks.length < albumTracks.total);

  const trackParsed = (
    await extractTracks(tracks.filter(track => track).map(track => track.id))
  ).map(track => {
    track.artists = [albumInfo.artists[0].name, ...track.artists];

    return track;
  });

  return {
    name: `${albumInfo.name} - ${albumInfo.label}`,
    items: trackParsed,
  };
};

export const extractArtist = async (artistId) => {
  const data = await callSpotifyApi(
    async () => await spotifyApi.artist.getArtist(artistId)
  );

  return {
    id: data.id,
    name: data.name,
    href: data.href,
  };
};

export const extractArtistAlbums = async (artistId) => {
  const albums = [];
  let offset = 0;
  let artistAlbums;
  do {
    artistAlbums = await callSpotifyApi(
      async () =>
        await spotifyApi.artist.getArtistAlbums(artistId, {
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${artistAlbums.total} albums`);
    }
    albums.push(...artistAlbums.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (albums.length < artistAlbums.total);
  // remove albums that are not direct artist albums

  return albums;
};

export const extractEpisodes = async (episodeIds) => {
  const episodes = [];
  let episodesResult;
  const chunkedEpisodes = episodeIds.chunk(20);
  for (let x = 0; x < chunkedEpisodes.length; x++) {
    logInfo('extracting episode set ' + `${x + 1}/${chunkedEpisodes.length}`);
    episodesResult = await callSpotifyApi(
      async () =>
        (await spotifyApi.episode.getSeveralEpisodes(chunkedEpisodes[x])).episodes
    );
    episodesResult = episodesResult.filter(episode => episode);
    episodes.push(...episodesResult);
  }

  return episodes.map((episode, index) => parseEpisode(episode, index));
};

export const extractShowEpisodes = async function (showId) {
  const showInfo = await callSpotifyApi(
    async () => await spotifyApi.show.getShow(showId)
  );
  const episodes = [];
  let offset = 0;
  let showEpisodes;
  do {
    showEpisodes = await callSpotifyApi(
      async () =>
        await spotifyApi.show.getShowsEpisodes(showId, {
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${showEpisodes.total} episodes`);
    }
    episodes.push(...showEpisodes.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (episodes.length < showEpisodes.total);

  return {
    name: `${showInfo.name} - ${showInfo.publisher}`,
    items: await extractEpisodes(episodes.map(episode => episode.id)),
  };
};

export const extractSavedShows = async function () {
  const shows = [];
  let offset = 0;
  let savedShows;
  do {
    savedShows = await callSpotifyApi(
      async () =>
        await spotifyApi.show.getUsersSavedShows({
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${savedShows.total} shows`);
    }
    shows.push(...savedShows.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (shows.length < savedShows.total);

  return shows.map(show => show.show);
};

export const extractSavedAlbums = async function () {
  const albums = [];
  let offset = 0;
  let savedAlbums;
  do {
    savedAlbums = await callSpotifyApi(
      async () =>
        await spotifyApi.album.getUserSavedAlbum({
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${savedAlbums.total} albums`);
    }
    albums.push(...savedAlbums.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (albums.length < savedAlbums.total);

  return albums.map(album => album.album);
};

export const extractSavedPlaylists = async function () {
  let offset = 0;
  const playlists = [];
  let savedPlaylists;
  do {
    savedPlaylists = await callSpotifyApi(
      async () =>
        await spotifyApi.playlist.getCurrentUserPlaylists({
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    if (!offset) {
      logInfo(`extracting ${savedPlaylists.total} playlists`);
    }
    playlists.push(...savedPlaylists.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (playlists.length < savedPlaylists.total);

  return playlists;
};

export const extractSavedTracks = async function () {
  const tracks = [];
  let offset = 0;
  let savedTracks;
  do {
    savedTracks = await callSpotifyApi(
      async () =>
        await spotifyApi.track.getUsersSavedTracks({
          limit: MAX_LIMIT_DEFAULT,
          offset: offset,
        })
    );
    tracks.push(...savedTracks.items.map(item => item.track));
    offset += MAX_LIMIT_DEFAULT;
    logInfo('extracting tracks ' + `${tracks.length}/${savedTracks.total}`);
  } while (tracks.length < savedTracks.total);
  const audioFeatures = await extractTrackAudioFeatures(
    tracks.map(track => track.id)
  );

  return {
    name: 'Saved Tracks',
    items: tracks
      .filter(track => track)
      .map(track => parseTrack(track, audioFeatures)),
  };
};

export const extractTrackAudioFeatures = async function (trackIds) {
  if (!trackIds.length) {
    return [];
  }

  let audioFeatures = [];
  for (let chunk of trackIds.chunk(MAX_LIMIT_DEFAULT)) {
    const chunkAudioFeatures = await callSpotifyApi(
      async () =>
        (await spotifyApi.track.getMultipleTracksAudioFeatures(chunk))
          .audio_features,
      true
    );

    if (!chunkAudioFeatures) {
      return [];
    }

    audioFeatures.push(...chunkAudioFeatures);
  }

  return audioFeatures.filter(x => x);
};
