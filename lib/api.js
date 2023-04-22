import SpotifyWebApi from 'spotify-web-api-node';
import open from 'open';
import express from 'express';
import puppeteer from 'puppeteer';
import { cliInputs } from './setup.js';
import Config from '../config.js';
import Constants from '../util/constants.js';
import { logInfo, logFailure } from '../util/log-helper.js';

const {
  spotifyApi: {
    clientId,
    clientSecret,
  },
} = Config;

const {
  AUTH: {
    SCOPES: {
      USERS_SAVED_PLAYLISTS, USERS_SAVED_TRACKS_ALBUMS, USERS_TOP_TRACKS,
    },
    STATE,
    REFRESH_ACCESS_TOKEN_SECONDS,
    TIMEOUT_RETRY,
  },
  INPUT_TYPES,
  MAX_LIMIT_DEFAULT,
  SERVER: { PORT, HOST, CALLBACK_URI },
} = Constants;

const spotifyApi = new SpotifyWebApi({
  clientId,
  clientSecret,
  redirectUri: `http://${HOST}:${PORT}${CALLBACK_URI}`,
});

const scopes = [
  USERS_SAVED_PLAYLISTS,
  USERS_SAVED_TRACKS_ALBUMS,
  USERS_TOP_TRACKS,
];

let nextTokenRefreshTime;

Object.defineProperty(Array.prototype, 'chunk', {
  value: function (chunkSize) {
    var R = [];
    for (var i = 0; i < this.length; i += chunkSize)
      R.push(this.slice(i, i + chunkSize));
    return R;
  },
});

const verifyCredentials = async () => {
  if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
    nextTokenRefreshTime = new Date();
    nextTokenRefreshTime.setSeconds(
      nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS,
    );
    logInfo('Generating new access token');
    await checkCredentials();
  }
};

const checkCredentials = async () => {
  if (await spotifyApi.getRefreshToken()) {
    await refreshToken();
  } else {
    const {
      inputs,
      username,
      password,
      login,
    } = cliInputs();

    const requiresLogin = inputs.find(input =>
      input.type == INPUT_TYPES.SONG.SAVED_ALBUMS ||
      input.type == INPUT_TYPES.SONG.SAVED_PLAYLISTS ||
      input.type == INPUT_TYPES.SONG.SAVED_TRACKS ||
      input.type == INPUT_TYPES.EPISODE.SAVED_SHOWS,
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
  const {
    username,
    password,
  } = cliInputs();
  const autoLogin = username.length > 0 && password.length > 0;
  const app = express();
  let resolve;
  const getCode = new Promise(_resolve => {
    resolve = _resolve;
  });
  app.get(CALLBACK_URI, function (req, res) {
    resolve(req.query.code);
    res.end('');
  });
  const server = await app.listen(PORT);

  const authURL = await spotifyApi.createAuthorizeURL(
    scopes,
    STATE,
    autoLogin,
  );

  let browser = null;

  logInfo(
    'Performing Spotify Auth Please Wait...',
  );

  if (autoLogin) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    try {
      await page.goto(authURL);
      await page.type('#login-username', username);
      await page.type('#login-password', password);
      await page.click('#login-button');
      await page.waitForSelector('#auth-accept');
      await page.click('#auth-accept');
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
        ].join(' '),
      );
    }
  } else {
    open(authURL);
  }

  const code = await getCode;
  setTokens(
    (await spotifyApi.authorizationCodeGrant(code)).body,
  );
  if (browser) {
    browser.close();
  }
  server.close();
};

const requestTokens = async () => {
  setTokens((await spotifyApi.clientCredentialsGrant()).body);
};

const refreshToken = async () => {
  setTokens((await spotifyApi.refreshAccessToken()).body);
};

const setTokens = tokens => {
  spotifyApi.setAccessToken(tokens['access_token']);
  spotifyApi.setRefreshToken(tokens['refresh_token']);
};
// common wrapper for api calls
// to have token verification and api throttling mitigation
const callSpotifyApi = async function (apiCall) {
  const maxRetries = 5;
  let tries = 1;
  let error;

  while (tries <= maxRetries) {
    await verifyCredentials();

    try {
      return await apiCall();
    } catch (e) {
      error = e;
      logInfo(
        `Got a spotify api error (${e})\n` +
        `Timing out for 5 minutes x ${tries}`,
      );
      await new Promise(resolve => setTimeout(resolve, TIMEOUT_RETRY * 1000));
      tries++;
    }
  }
  // if it still fails after all the timeouts and retries throw again
  throw new Error(error);
};

export async function extractTracks(trackIds) {
  const extractedTracks = [];
  const chunkedTracks = trackIds.chunk(20);
  for (let x = 0; x < chunkedTracks.length; x++) {
    logInfo('extracting track set ' +
      `${x + 1}/${chunkedTracks.length}`);
    const tracks = await callSpotifyApi(
      async () => (await spotifyApi.getTracks(chunkedTracks[x])).body.tracks,
    );
    extractedTracks.push(...tracks);
  }
  const audioFeatures = await extractTrackAudioFeatures(
    extractedTracks.map(track => track.id),
  );
  return extractedTracks.map(track => parseTrack(track, audioFeatures));
}

const parseTrack = (track, audioFeatures) => {
  const audioFeature = audioFeatures.find(
    audioFeature => audioFeature.id == track.id,
  );
  return {
    name: track.name,
    bpm: audioFeature.tempo,
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

const parseEpisode = (episode, index = 0) => {
  return {
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
  };
};

export async function extractPlaylist(playlistId) {
  const playlistInfo = await callSpotifyApi(
    async () => (await spotifyApi.getPlaylist(
      playlistId,
      { limit: 1 },
    )).body,
  );
  const tracks = [];
  let playlistData;
  let offset = 0;
  do {
    playlistData = await callSpotifyApi(
      async () => (await spotifyApi.getPlaylistTracks(
        playlistId,
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${playlistData.total} tracks`);
    }
    tracks.push(
      ...playlistData.items,
    );
    offset += MAX_LIMIT_DEFAULT;
  } while (tracks.length < playlistData.total);
  const audioFeatures = await extractTrackAudioFeatures(
    tracks.map(track => track.id),
  );
  return {
    name: `${playlistInfo.name} - ${playlistInfo.owner.display_name}`,
    items: tracks
      .filter(item => item.track)
      .map(item => parseTrack(item.track, audioFeatures)),
  };
}

export async function extractAlbum(albumId) {
  const albumInfo = await callSpotifyApi(
    async () => (await spotifyApi.getAlbum(
      albumId,
      { limit: 1 },
    )).body,
  );
  const tracks = [];
  let offset = 0;
  let albumTracks;
  do {
    albumTracks = await callSpotifyApi(
      async () => (await spotifyApi.getAlbumTracks(
        albumId,
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${albumTracks.total} tracks`);
    }
    tracks.push(...albumTracks.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (tracks.length < albumTracks.total);

  const trackParsed = (await extractTracks(
    tracks
      .filter(track => track)
      .map(track => track.id),
  )).map(track => {
    track.artists = [albumInfo.artists[0].name, ...track.artists];
    return track;
  });

  return {
    name: `${albumInfo.name} - ${albumInfo.label}`,
    items: trackParsed,
  };
}

export async function extractArtist(artistId) {
  const data = await callSpotifyApi(
    async () => (await spotifyApi.getArtist(artistId)).body,
  );
  return {
    id: data.id,
    name: data.name,
    href: data.href,
  };
}

export async function extractArtistAlbums(artistId) {
  const albums = [];
  let offset = 0;
  let artistAlbums;
  do {
    artistAlbums = await callSpotifyApi(
      async () => (await spotifyApi.getArtistAlbums(
        artistId,
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${artistAlbums.total} albums`);
    }
    albums.push(...artistAlbums.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (albums.length < artistAlbums.total);
  // remove albums that are not direct artist albums
  return albums;
}

export async function extractEpisodes(episodeIds) {
  const episodes = [];
  let episodesResult;
  const chunkedEpisodes = episodeIds.chunk(20);
  for (let x = 0; x < chunkedEpisodes.length; x++) {
    logInfo('extracting episode set ' +
      `${x + 1}/${chunkedEpisodes.length}`);
    episodesResult = await callSpotifyApi(
      async () => (await spotifyApi.getEpisodes(
        chunkedEpisodes[x],
      )).body.episodes,
    );
    episodesResult = episodesResult.filter(episode => episode);
    episodes.push(...episodesResult);
  }
  return episodes.map((episode, index) => parseEpisode(episode, index));
}

export async function extractShowEpisodes(showId) {
  const showInfo = await callSpotifyApi(
    async () => (await spotifyApi.getShow(
      showId,
    )).body,
  );
  const episodes = [];
  let offset = 0;
  let showEpisodes;
  do {
    showEpisodes = await callSpotifyApi(
      async () => (await spotifyApi.getShowEpisodes(
        showId,
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
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
}

export async function extractSavedShows() {
  const shows = [];
  let offset = 0;
  let savedShows;
  do {
    savedShows = await callSpotifyApi(
      async () => (await spotifyApi.getMySavedShows(
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${savedShows.total} shows`);
    }
    shows.push(...savedShows.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (shows.length < savedShows.total);
  return shows.map(show => show.show);
}

export async function extractSavedAlbums() {
  const albums = [];
  let offset = 0;
  let savedAlbums;
  do {
    savedAlbums = await callSpotifyApi(
      async () => (await spotifyApi.getMySavedAlbums(
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${savedAlbums.total} albums`);
    }
    albums.push(...savedAlbums.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (albums.length < savedAlbums.total);

  return albums.map(album => album.album);
}

export async function extractSavedPlaylists() {
  let offset = 0;
  const playlists = [];
  let savedPlaylists;
  do {
    savedPlaylists = await callSpotifyApi(
      async () => (await spotifyApi.getUserPlaylists(
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    if (!offset) {
      logInfo(`extracting ${savedPlaylists.total} playlists`);
    }
    playlists.push(...savedPlaylists.items);
    offset += MAX_LIMIT_DEFAULT;
  } while (playlists.length < savedPlaylists.total);

  return playlists;
}

export async function extractSavedTracks() {
  const tracks = [];
  let offset = 0;
  let savedTracks;
  do {
    savedTracks = await callSpotifyApi(
      async () => (await spotifyApi.getMySavedTracks(
        { limit: MAX_LIMIT_DEFAULT, offset: offset },
      )).body,
    );
    tracks.push(
      ...savedTracks.items.map(item => item.track),
    );
    offset += MAX_LIMIT_DEFAULT;
    logInfo('extracting tracks ' +
      `${tracks.length}/${savedTracks.total}`);
  } while (tracks.length < savedTracks.total);
  const audioFeatures = await extractTrackAudioFeatures(
    tracks.map(track => track.id),
  );
  return {
    name: 'Saved Tracks',
    items: tracks
      .filter(track => track)
      .map(track => parseTrack(
        track,
        audioFeatures,
      )),
  };
}

export async function extractTrackAudioFeatures(trackIds) {
  return await callSpotifyApi(
    async () => (await spotifyApi.getAudioFeaturesForTracks(
      trackIds,
    )).body.audio_features,
  );
}
