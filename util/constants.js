export default {
  AUTH: {
    SCOPES: {
      USERS_SAVED_PLAYLISTS: 'playlist-read-private',
      USERS_TOP_TRACKS: 'user-top-read',
      USERS_SAVED_TRACKS_ALBUMS: 'user-library-read',
    },
    STATE: 'some-random-state',
    // set to 55 minutes expires every 60 minutes
    REFRESH_ACCESS_TOKEN_SECONDS: 55 * 60,
    // default timeout of 5 minutes when spotify api fails
    TIMEOUT_RETRY: 5 * 60,
  },
  INPUT_TYPES: {
    SONG: {
      SONG: 'song',
      PLAYLIST: 'playlist',
      ALBUM: 'album',
      ARTIST: 'artist',
      SAVED_ALBUMS: 'savedAlbums',
      SAVED_TRACKS: 'savedTracks',
      SAVED_PLAYLISTS: 'savedPlaylists',
    },
    EPISODE: {
      SHOW: 'show',
      EPISODE: 'episode',
      SAVED_SHOWS: 'savedShows',
    },
    YOUTUBE: 'youtube',
  },
  FFMPEG: {
    ASET: 'asetpts=PTS-STARTPTS',
    TIMEOUT_MINUTES: 30,
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
    GENERIC_IMAGE: 'https://lh3.googleusercontent.com/z6Sl4j9zQ88oUKN' +
      'y0G3PAMiVwy8DzQLh_ygyvBXv0zVNUZ_wQPN_n7EAR2By3dhoUpX7kTpaHjRP' +
      'ni1MHwKpaBJbpNqdEsHZsH4q',
    VALID_CONTEXTS: ['itemName', 'albumName', 'artistName'],
  },
};