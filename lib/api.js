'use strict';
const SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
  clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009',
});
const MAX_LIMIT_DEFAULT = 50;
module.exports = {
  spotifyApi,
  setup: async () => {
    return spotifyApi.clientCredentialsGrant().then(
      data => {
        return data.body['access_token'];
      },
      err => {
        console.error(
          'Something went wrong when retrieving an access token :',
          err.message,
        );
        process.exit(-1);
      },
    );
  },
  setToken: async token => {
    spotifyApi.setAccessToken(token);
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
    const albums = artistAlbums.items;
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
};

