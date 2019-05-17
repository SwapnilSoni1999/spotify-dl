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
    for (const link of input) {
      
    }
  } catch (error) {
    spinner.fail(`Something went wrong!`);
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
