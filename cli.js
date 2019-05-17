#!/usr/bin/env node
'use strict';
const path = require('path');
const ora = require('ora');
const meow = require('meow');
const getLink = require('./util/get-link');
const getTrack = require('./util/get-track');
const download = require('./lib/downloader');

const cli = meow(
  `
  Usage
      $ spotifydl <link> …

	Options
	  --vid, -v  Download music video of given spotify track

  Examples
      $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
      $ spotifydl -v https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI
`,
  {
    flags: {
      help: {
        alias: 'h',
      },
      video: {
        alias: 'v',
        type: 'boolean',
      },
    },
  }
);

const { input, flags } = cli;
const isVideo = flags.video;

if (!input[0]) {
  console.log('See spotifydl --help for instructions');
  process.exit(1);
}

(async () => {
  try {
    for (const link of input) {
      const spinner = ora(`Searching spotify...`).start();

      const { title, artist } = await getTrack(link);
      const songName = title + artist;

      spinner.succeed(`Song: ${title}`);

      spinner.start('Searching youtube...');
      const youtubeLink = await getLink(songName);

      spinner.succeed('Got youtube link...');

      spinner.start('Downloading...');

      const ext = isVideo ? 'mp4' : 'mp3';
      const output = path.resolve(__dirname, `${title} - ${artist}.${ext}`);

      download(youtubeLink, output, isVideo, spinner);
    }
  } catch (error) {
    console.log('Something failed');
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
