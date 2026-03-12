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
    appKey: 'b334016b45e24f7781b0909f24cf2ea7:63af7d80586a425fba4677d9923aae7e'
  },
  isTTY: process.stdout.isTTY,
};
