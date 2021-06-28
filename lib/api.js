'use strict';
const SpotifyWebApi = require('spotify-web-api-node');
const open = require('open');
const puppeteer = require('puppeteer');
const { cliInputs, getSpinner } = require('./setup');
const {
  AUTH: { SCOPES, STATE },
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

module.exports = {
  spotifyApi,
  checkCredentials: async function () {
    if (await spotifyApi.getRefreshToken()) {
      await this.refreshToken();
    } else {
      const {
        inputs,
      } = cliInputs();

      const requiresLogin = inputs.find(input =>
        input.type == INPUT_TYPES.SAVED_ALBUMS ||
        input.type == INPUT_TYPES.SAVED_PLAYLISTS ||
        input.type == INPUT_TYPES.SAVED_TRACKS,
      );

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
    return this.parseTrack((await spotifyApi.getTrack(trackId)).body);
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
    const data = (await spotifyApi.getPlaylist(
      playlistId,
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let tracks = data.tracks.items.map(item => item.track);
    if (data.tracks.next) {
      let offset = tracks.length;
      while (tracks.length < data.tracks.total) {
        const playlistTracksData = (await spotifyApi
          .getPlaylistTracks(
            playlistId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        tracks = tracks.concat(
          playlistTracksData.items.map(item => item.track),
        );
        offset += MAX_LIMIT_DEFAULT;
      }
    }

    return {
      name: `${data.name} - ${data.owner.display_name}`,
      tracks: tracks
        .filter(track => track)
        .map(track => this.parseTrack(track)),
    };
  },
  extractAlbum: async function (albumId) {
    const data = (await spotifyApi.getAlbum(
      albumId,
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let tracks = data.tracks.items;
    if (data.tracks.next) {
      let offset = tracks.length;
      while (tracks.length < data.tracks.total) {
        const albumTracks = (await spotifyApi
          .getAlbumTracks(
            albumId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        tracks = tracks.concat(albumTracks.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }

    return {
      name: `${data.name} - ${data.label}`,
      tracks: await this.extractTracks(
        tracks
          .filter(track => track)
          .map(track => track.id),
      ),
    };
  },
  extractArtist: async function (artistId) {
    const data = (await spotifyApi.getArtist(artistId)).body;
    return {
      id: data.id,
      name: data.name,
      href: data.href,
    };
  },
  extractArtistAlbums: async function (artistId) {
    const artistAlbums = (await spotifyApi.getArtistAlbums(
      artistId,
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let albums = artistAlbums.items;
    if (artistAlbums.next) {
      let offset = albums.length;
      while (albums.length < artistAlbums.total) {
        const additionalArtistAlbums = (await spotifyApi
          .getArtistAlbums(
            artistId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        albums = albums.concat(additionalArtistAlbums.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }

    return albums;
  },
  extractSavedAlbums: async function () {
    const savedAlbums = (await spotifyApi.getMySavedAlbums(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let albums = savedAlbums.items;
    if (savedAlbums.next) {
      let offset = albums.length;
      while (albums.length < savedAlbums.total) {
        const additionalSavedAlbums = (await spotifyApi
          .getMySavedAlbums(
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        albums = albums.concat(additionalSavedAlbums.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }

    return albums.map(album => album.album);
  },
  extractSavedPlaylists: async function () {
    const savedPlaylists = (await spotifyApi.getUserPlaylists(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let playlists = savedPlaylists.items;
    if (savedPlaylists.next) {
      let offset = playlists.length;
      while (playlists.length < savedPlaylists.total) {
        const additionalSavedPlaylists = (await spotifyApi
          .getUserPlaylists(
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        playlists = playlists.concat(additionalSavedPlaylists.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }

    return playlists;
  },
  extractSavedTracks: async function () {
    const spinner = getSpinner();
    const savedTracks = (await spotifyApi.getMySavedTracks(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let tracks = savedTracks.items.map(item => item.track);
    spinner.info('extracting tracks ' +
      `${tracks.length}/${savedTracks.total}`);
    if (savedTracks.next) {
      let offset = tracks.length;
      while (tracks.length < savedTracks.total) {
        const additionalSavedTracks = (await spotifyApi
          .getMySavedTracks(
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        tracks = tracks.concat(
          additionalSavedTracks.items.map(item => item.track),
        );
        offset += MAX_LIMIT_DEFAULT;
        spinner.info('extracting tracks ' +
          `${savedTracks.length}/${savedTracks.total}`);
      }
    }

    return {
      name: 'Saved Tracks',
      tracks: tracks
        .filter(track => track)
        .map(track => this.parseTrack(track)),
    };
  },
};

