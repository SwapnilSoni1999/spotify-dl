'use strict';
const SpotifyWebApi = require('spotify-web-api-node');
const open = require('open');
const puppeteer = require('puppeteer');
const { getSpinner } = require('./setup');
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

module.exports = options => ({
  spotifyApi,
  verifyCredentials: async function () {
    if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
      nextTokenRefreshTime = new Date();
      nextTokenRefreshTime.setSeconds(
        nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS,
      );
      const spinner = getSpinner();
      spinner.info('Generating new access token');
      await this.checkCredentials();
    }
  },
  checkCredentials: async function () {
    if (await spotifyApi.getRefreshToken()) {
      await this.refreshToken();
    } else {
      const requiresLogin = options.savedAlbums || options.savedTracks || options.savedPlaylists

      if (requiresLogin) {
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
    } = options;
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
    const spinner = getSpinner();
    const maxRetries = 5;
    let tries = 1;
    let error;

    while (tries <= maxRetries) {
      await this.verifyCredentials();

      try {
        return await apiCall();
      } catch (e) {
        error = e;
        spinner.info(
          `Got a spotify api error, Timing out for 5 minutes x ${tries}`,
        );
        await new Promise(resolve => setTimeout(resolve, TIMEOUT_RETRY * 1000));
        tries++;
      }
    }
    // if it still fails after all the timeouts and retries throw again
    throw new Error(error);
  },
  extractTracks: async function (tracks) {
    const spinner = getSpinner();
    const extractedTracks = [];
    for (let x = 0; x < tracks.length; x++) {
      spinner.info('extracting tracks ' +
        `${x + 1}/${tracks.length}`);
      extractedTracks.push(await this.extractTrack(tracks[x]));
    }
    return extractedTracks;
  },
  extractTrack: async function (trackId) {
    const track = await this.callSpotifyApi(
      async () => (await spotifyApi.getTrack(trackId)).body,
    );
    return this.parseTrack(track);
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
      tracks.push(
        ...playlistData.items.map(item => item.track),
      );
      offset += MAX_LIMIT_DEFAULT;
    } while (tracks.length < playlistData.total);

    return {
      name: `${playlistInfo.name} - ${playlistInfo.owner.display_name}`,
      tracks: tracks
        .filter(track => track)
        .map(track => this.parseTrack(track)),
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
      tracks.push(...albumTracks.items);
      offset += MAX_LIMIT_DEFAULT;
    } while (tracks.length < albumTracks.total);

    return {
      name: `${albumInfo.name} - ${albumInfo.label}`,
      tracks: await this.extractTracks(
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
      albums.push(...artistAlbums.items);
      offset += MAX_LIMIT_DEFAULT;
    } while (albums.length < artistAlbums.total);
    // remove albums that are not direct artist albums
    return albums.filter(
      album => album.artists.find(artist => artist.id == artistId),
    );
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
      playlists.push(...savedPlaylists.items);
      offset += MAX_LIMIT_DEFAULT;
    } while (playlists.length < savedPlaylists.total);

    return playlists;
  },

  extractSavedTracks: async function () {
    const spinner = getSpinner();
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
      spinner.info('extracting tracks ' +
        `${tracks.length}/${savedTracks.total}`);
    } while (tracks.length < savedTracks.total);

    return {
      name: 'Saved Tracks',
      tracks: tracks
        .filter(track => track)
        .map(track => this.parseTrack(track)),
    };
  },
});

