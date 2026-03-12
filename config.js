export default {
  youtubeDLConfig: {
    quality: 'highestaudio',
  },
  flags: {
    cacheFile: '.spdlcache',
    cookieFile: 'cookies.txt',
    downloadReport: true,
    output: process.cwd(),
    extraSearch: '',
    login: false,
    appKey: '',
    password: '',
    username: '',
    savedAlbums: false,
    savedPlaylists: false,
    savedTracks: false,
    savedShows: false,
    outputOnly: false,
    downloadLyrics: false,
    searchFormat: '',
    outputFormat: '{artistName}___{albumName}___{itemName}',
    exclusionFilters: '',
    outputFileType: 'mp3',
    appKey: '9450519df94d4e23842fd4cd8bc1eb74:8cceec517caa4e499350ece0ddd167f5'
  },
  isTTY: process.stdout.isTTY,
};
