'use strict';
const fs = require('fs');
const ytdl = require('@microlink/youtube-dl');
const options = require('../config');
/**
 * This function downloads the given youtube video in best audio format as mp3 file
 *
 * @param {*} youtubeLink link of youtube video
 * @param {*} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 */
const downloader = (youtubeLink, output, spinner) => {
  const download = ytdl(youtubeLink, options);

  download.pipe(fs.createWriteStream(output));

  download.on('progress', (chunkLength, downloaded, total) => {
    spinner.text = `Downloading ${(downloaded / 1024 / 1024).toFixed(
      2
    )}MB of ${(total / 1024 / 1024).toFixed(2)}MB\n`;
  });

  download.on('end', () => {
    spinner.succeed('Download completed');
  });
};

module.exports = downloader;
