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

  clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
  clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009',
const spotifyApi = new SpotifyWebApi({
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
  extractTrack: async trackId => {
    const data = (await spotifyApi.getTrack(trackId)).body;
    var details = {
      name: '',
      artists: [],
      album_name: '',
      release_date: '',
      cover_url: '',
    };
    details.name = data.name;
    data.artists.forEach(artist => {
      details.artists.push(artist.name);
    });
    details.album_name = data.album.name;
    details.release_date = data.album.release_date;
    details.cover_url = data.album.images[0].url;
    return details;
  },
  extractPlaylist: async playlistId => {
    const data = (await spotifyApi.getPlaylist(
      playlistId,
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    const details = {
      name: '',
      total_tracks: 0,
      tracks: data.tracks.items.map(item => item.track.id),
    };

    details.name = data.name + ' - '
      + data.owner.display_name;
    details.total_tracks = data.tracks.total;
    if (data.tracks.next) {
      let offset = details.tracks.length;
      while (details.tracks.length < details.total_tracks) {
        const playlistTracksData = (await spotifyApi
          .getPlaylistTracks(
            playlistId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        details.tracks = details.tracks.concat(
          playlistTracksData.items.map(item => item.track.id),
        );
        offset += MAX_LIMIT_DEFAULT;
      }
    }
    return details;
  },
  extractAlbum: async albumId => {
    const data = (await spotifyApi.getAlbum(
      albumId,
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    const details = {
      name: '',
      total_tracks: 0,
      tracks: data.tracks.items.map(item => item.id),
    };
    details.name = data.name + ' - ' + data.label;
    details.total_tracks = data.tracks.total;
    if (data.tracks.next) {
      let offset = details.tracks.length;
      while (details.tracks.length < data.tracks.total) {
        const albumTracks = (await spotifyApi
          .getAlbumTracks(
            albumId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;
        details.tracks = details.tracks
          .concat(albumTracks.items.map(item => item.id));
        offset += MAX_LIMIT_DEFAULT;
      }
    }
    return details;
  },
  extractArtist: async artistId => {
    const data = (await spotifyApi.getArtist(artistId)).body;
    return {
      id: data.id,
      name: data.name,
      href: data.href,
    };
  },
  extractArtistAlbums: async artistId => {
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
  extractSavedAlbums: async () => {
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
    return albums;
  },
  extractSavedPlaylists: async () => {
    const savedPlaylists = (await spotifyApi.getUserPlaylists(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let playlists = savedPlaylists.items;
    if (savedPlaylists.next) {
      let offset = playlists.length;
      while (playlists.length < savedPlaylists.total) {
        const additionalSavedPlaylists = (await spotifyApi
          .getMySavedAlbums(
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;

        playlists = playlists.concat(additionalSavedPlaylists.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }
    return playlists;
  },
  extractSavedTracks: async () => {
    const savedTracks = (await spotifyApi.getMySavedTracks(
      { limit: MAX_LIMIT_DEFAULT },
    )).body;
    let tracks = savedTracks.items;
    if (savedTracks.next) {
      let offset = tracks.length;
      while (tracks.length < savedTracks.total) {
        const additionalSavedTracks = (await spotifyApi
          .getMySavedAlbums(
            { limit: MAX_LIMIT_DEFAULT, offset: offset },
          )).body;

        tracks = tracks.concat(additionalSavedTracks.items);
        offset += MAX_LIMIT_DEFAULT;
      }
    }
    return tracks;
  },
};

