module.exports = {
  AUTH: {
    SCOPES: {
      USERS_SAVED_PLAYLISTS: 'playlist-read-private',
      USERS_TOP_TRACKS: 'user-top-read',
      USERS_SAVED_TRACKS_ALBUMS: 'user-library-read',
    },
    STATE: 'some-random-state',
  },
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
  FFMPEG: {
    ASET: 'asetpts=PTS-STARTPTS',
  },
  MAX_LIMIT_DEFAULT: 50,
  SERVER: {
    PORT: 7654,
    HOST: 'localhost',
    CALLBACK_URI: '/callback',
  },
  SPONSOR_BLOCK: {
    CATEGORIES: {
      SPONSOR: 'sponsor',
      INTRO: 'intro',
      OUTRO: 'outro',
      INTERACTION: 'interaction',
      SELF_PROMO: 'selfpromo',
      MUSIC_OFF_TOPIC: 'music_offtopic',
    },
  },
  YOUTUBE_SEARCH: {
    // this roughly equates to a max of 30mb
    MAX_MINUTES: 15,
  },
};