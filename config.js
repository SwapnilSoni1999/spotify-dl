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
    appKey: '48de10c5c38449d982b9d10010f07c20:ffb61c760ba24f51a743c95c9b322606'
  },
  isTTY: process.stdout.isTTY,
};
