#!/usr/bin/env node
'use strict';
const path = require('path');
const ora = require('ora');
const meow = require('meow');
const getLink = require('./util/get-link');
const songdata = require('./util/get-songdata');
const urlParser = require('./util/url-parser');

const download = require('./lib/downloader');

const cli = meow(
  `
  Usage
      $ spotifydl <link> …

  Examples
      $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
      $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI
`,
  {
    flags: {
      help: {
        alias: 'h',
      },
      version: {
        alias: 'v',
      },
    },
  }
);

const { input } = cli;

if (!input[0]) {
  console.log('See spotifydl --help for instructions');
  process.exit(1);
}

(async () => {
  const spinner = ora(`Searching…`).start();
  try {
    var spotifye = new songdata();
    for (const link of input) {
      const urlType = await urlParser(link);
      var songData = {};
      const URL = link;
      switch(urlType) {
        case 'song': {
          songData = await spotifye.getTrack(URL);
          const songName = songData.name + songData.artist;
          
          spinner.text = `${songData.name}`;

          const youtubeLink = await getLink(songName);
          const output = path.resolve(__dirname, `${songData.name} - ${songData.artist}.mp3`);

          await download(youtubeLink, output, spinner);
          break;
        }
        case 'playlist': {
          songData = await spotifye.getPlaylist(URL);
          
          break;
        }
        case 'album': {
          songData = await spotifye.getAlbum(URL);
          
          break;
        }
        case 'artist': {
          songData = await spotifye.getArtist(URL);
          
          break;
        }
        default: {
          throw new Error('Invalid URL type');
        }
      }
    }
  } catch (error) {
    spinner.fail(`Something went wrong!`);
    console.log(error);
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
