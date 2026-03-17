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
    appKey: 'b334016b45e24f7781b0909f24cf2ea7:c4ab0216fae54be2af9c15ce06736b57'
  },
  isTTY: process.stdout.isTTY,
};
