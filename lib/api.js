'use strict';
const SpotifyWebApi = require('spotify-web-api-node');
const open = require('open');
const puppeteer = require('puppeteer');
const { cliInputs } = require('./setup');
const {
  AUTH: { SCOPES, STATE, REFRESH_ACCESS_TOKEN_SECONDS, TIMEOUT_RETRY },
  INPUT_TYPES,
  MAX_LIMIT_DEFAULT,
  SERVER: {
    PORT,
    HOST,
    CALLBACK_URI,
  },
} = require('../util/constants');
const express = require('express');
const { logInfo, logFailure } = require('../util/log-helper');

const spotifyApi = new SpotifyWebApi({
  clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
  clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009',
  redirectUri: `http://${HOST}:${PORT}${CALLBACK_URI}`,
});

const scopes = [
  SCOPES.USERS_SAVED_PLAYLISTS,
  SCOPES.USERS_SAVED_TRACKS_ALBUMS,
  SCOPES.USERS_TOP_TRACKS,
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

module.exports = {
  spotifyApi,
  verifyCredentials: async function () {
    if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
      nextTokenRefreshTime = new Date();
      nextTokenRefreshTime.setSeconds(
        nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS,
      );
      logInfo('Generating new access token');
      await this.checkCredentials();
    }
  },
  checkCredentials: async function () {
    if (await spotifyApi.getRefreshToken()) {
      await this.refreshToken();
    } else {
      const {
        inputs,
        username,
        password,
      } = cliInputs();

      const requiresLogin = inputs.find(input =>
        input.type == INPUT_TYPES.SONG.SAVED_ALBUMS ||
        input.type == INPUT_TYPES.SONG.SAVED_PLAYLISTS ||
        input.type == INPUT_TYPES.SONG.SAVED_TRACKS ||
        input.type == INPUT_TYPES.EPISODE.SAVED_SHOWS,
      );

      const requestingLogin = username && password;

      if (requiresLogin || requestingLogin) {
        await this.requestAuthorizedTokens();
      } else {
        await this.requestTokens();
      }
    }
  },
  requestAuthorizedTokens: async function () {
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

    if (autoLogin) {
      browser = await puppeteer.launch({
        args: [
          // Required for Docker version of Puppeteer
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // This will write shared memory files into /tmp instead of /dev/shm,
          // because Docker’s default for /dev/shm is 64MB
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
      } catch (_e) {
        console.log('Please find a screenshot of why the auto login failed at' +
          './failure.png');
        await page.screenshot({
          path: './failure.png',
          fullPage: true,
        });
      }
    } else {
      open(authURL);
    }

    const code = await getCode;
    this.setTokens(
      (await spotifyApi.authorizationCodeGrant(code)).body,
    );
    if (browser) {
      browser.close();
    }
    server.close();
  },
  requestTokens: async function () {
    this.setTokens((await spotifyApi.clientCredentialsGrant()).body);
  },
  refreshToken: async function () {
    this.setTokens((await spotifyApi.refreshAccessToken()).body);
  },
  setTokens: tokens => {
    spotifyApi.setAccessToken(tokens['access_token']);
    spotifyApi.setRefreshToken(tokens['refresh_token']);
  },
  // common wrapper for api calls
  // to have token verification and api throttling mitigation
  callSpotifyApi: async function (apiCall) {
    const maxRetries = 5;
    let tries = 1;
    let error;

    while (tries <= maxRetries) {
      await this.verifyCredentials();

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
  },
  extractTracks: async function (trackIds) {
    const extractedTracks = [];
    const chunkedTracks = trackIds.chunk(20);
    for (let x = 0; x < chunkedTracks.length; x++) {
      logInfo('extracting track set ' +
        `${x + 1}/${chunkedTracks.length}`);
      const tracks = await this.callSpotifyApi(
        async () => (await spotifyApi.getTracks(chunkedTracks[x])).body.tracks,
      );
      extractedTracks.push(...tracks);
    }
    return extractedTracks.map(track => this.parseTrack(track));
  },
  parseTrack: function (track) {
    return {
      name: track.name,
      artist_name: track.artists.map(artist => artist.name)[0],
      album_name: track.album.name,
      release_date: track.album.release_date,
      cover_url: track.album.images.map(image => image.url)[0],
      id: track.id,
    };
  },
  parseEpisode: function (episode) {
    return {
      name: episode.name,
      artist_name: episode.show.publisher,
      album_name: episode.show.name,
      release_date: episode.release_date,
      cover_url: episode.images.map(image => image.url)[0],
      id: episode.id,
    };
  },
  extractPlaylist: async function (playlistId) {
    const playlistInfo = await this.callSpotifyApi(
      async () => (await spotifyApi.getPlaylist(
        playlistId,
        { limit: 1 },
      )).body,
    );
    const tracks = [];
    let playlistData;
    let offset = 0;
    do {
      playlistData = await this.callSpotifyApi(
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

    return {
      name: `${playlistInfo.name} - ${playlistInfo.owner.display_name}`,
      items: tracks
        .filter(item => item.track)
        .map(item => this.parseTrack(item.track)),
    };
  },
  extractAlbum: async function (albumId) {
    const albumInfo = await this.callSpotifyApi(
      async () => (await spotifyApi.getAlbum(
        albumId,
        { limit: 1 },
      )).body,
    );
    const tracks = [];
    let offset = 0;
    let albumTracks;
    do {
      albumTracks = await this.callSpotifyApi(
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

    return {
      name: `${albumInfo.name} - ${albumInfo.label}`,
      items: await this.extractTracks(
        tracks
          .filter(track => track)
          .map(track => track.id),
      ),
    };
  },
  extractArtist: async function (artistId) {
    const data = await this.callSpotifyApi(
      async () => (await spotifyApi.getArtist(artistId)).body,
    );
    return {
      id: data.id,
      name: data.name,
      href: data.href,
    };
  },
  extractArtistAlbums: async function (artistId) {
    const albums = [];
    let offset = 0;
    let artistAlbums;
    do {
      artistAlbums = await this.callSpotifyApi(
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
    return albums.filter(
      album => album.artists.find(artist => artist.id == artistId),
    );
  },
  extractEpisodes: async function (episodeIds) {
    const episodes = [];
    let episodesResult;
    const chunkedEpisodes = episodeIds.chunk(20);
    for (let x = 0; x < chunkedEpisodes.length; x++) {
      logInfo('extracting episode set ' +
        `${x + 1}/${chunkedEpisodes.length}`);
      episodesResult = await this.callSpotifyApi(
        async () => (await spotifyApi.getEpisodes(
          chunkedEpisodes[x],
        )).body.episodes,
      );
      episodes.push(...episodesResult);
    }
    return episodes.map(episode => this.parseEpisode(episode));
  },
  extractShowEpisodes: async function (showId) {
    const showInfo = await this.callSpotifyApi(
      async () => (await spotifyApi.getShow(
        showId,
      )).body,
    );
    const episodes = [];
    let offset = 0;
    let showEpisodes;
    do {
      showEpisodes = await this.callSpotifyApi(
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
      items: await this.extractEpisodes(episodes.map(episode => episode.id)),
    };
  },
  extractSavedShows: async function () {
    const shows = [];
    let offset = 0;
    let savedShows;
    do {
      savedShows = await this.callSpotifyApi(
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
  },
  extractSavedAlbums: async function () {
    const albums = [];
    let offset = 0;
    let savedAlbums;
    do {
      savedAlbums = await this.callSpotifyApi(
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
  },
  extractSavedPlaylists: async function () {
    let offset = 0;
    const playlists = [];
    let savedPlaylists;
    do {
      savedPlaylists = await this.callSpotifyApi(
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
  },
  extractSavedTracks: async function () {
    const tracks = [];
    let offset = 0;
    let savedTracks;
    do {
      savedTracks = await this.callSpotifyApi(
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

    return {
      name: 'Saved Tracks',
      items: tracks
        .filter(track => track)
        .map(track => this.parseTrack(track)),
    };
  },
};

