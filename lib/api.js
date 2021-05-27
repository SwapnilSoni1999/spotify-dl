'use strict';
const SpotifyWebApi = require('spotify-web-api-node');
const open = require('open');
const { cliInputs } = require('./setup');
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

    open(await spotifyApi.createAuthorizeURL(
      scopes,
      STATE,
    ));

    const code = await getCode;
    this.setTokens(
      (await spotifyApi.authorizationCodeGrant(code)).body,
    );
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
    const extractedTracks = [];
    for (let x = 0; x < tracks.length; x++) {
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
    const savedTracks = (await spotifyApi.getMySavedTracks(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let tracks = savedTracks.items.map(item => item.track);
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

