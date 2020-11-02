'use strict';
const ytdl = require('ytdl-core');
const options = require('../config');
const ffmpeg = require('fluent-ffmpeg');
/**
 * This function downloads the given youtube video in best audio format as mp3 file
 *
 * @param {*} youtubeLink link of youtube video
 * @param {*} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 * @param {function} callback callback after work finishes
 */
const downloader = (youtubeLink, output, spinner, callback) => {
  const download = ytdl(youtubeLink, options);
  download.on('progress', (chunk, downloaded, total) => {
    spinner.text = `Downloading ${(downloaded / 1024 / 1024).toFixed(
      2
    )}MB of ${(total / 1024 / 1024).toFixed(2)}MB\n`;
  });

  ffmpeg(download)
    .audioBitrate(256)
    .save(`${output}`)
    .on('end', () => {
      spinner.succeed('Download completed.');
      if (typeof callback === 'function') callback();
    })
    .on('error', () => {
      spinner.fail('Could not download song');
      if (typeof callback === 'function') callback(true);
    });
};

module.exports = downloader;
