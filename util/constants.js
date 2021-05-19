module.exports = {
  INPUT_TYPES: {
    SONG: 'song',
    PLAYLIST: 'playlist',
    ALBUM: 'album',
    ARTIST: 'artist',
    YOUTUBE: 'youtube',
    SAVED_ALBUMS: 'savedAlbums',
    SAVED_TRACKS: 'savedTracks',
    SAVED_PLAYLISTS: 'savedPlaylists',
  },
  AUTH: {
    SCOPES: {
      USERS_SAVED_PLAYLISTS: 'playlist-read-private',
      USERS_TOP_TRACKS: 'user-top-read',
      USERS_SAVED_TRACKS_ALBUMS: 'user-library-read',
    },
    STATE: 'some-random-state',
  },
  MAX_LIMIT_DEFAULT: 50,
  SERVER: {
    PORT: 7654,
    HOST: 'localhost',
    CALLBACK_URI: '/callback',
  },
};