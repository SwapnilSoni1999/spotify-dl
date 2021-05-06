'use strict';
const ytdl = require('ytdl-core');
const options = require('../config');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

/**
 * This function downloads the given youtube video 
 * in best audio format as mp3 file
 *
 * @param {string} youtubeLink link of youtube video
 * @param {string} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 * @param {function} callback callback after work finishes
 */
const downloader = (youtubeLink, output, spinner, callback) => {
  const download = ytdl(youtubeLink, options);
  download.on('progress', (chunk, downloaded, total) => {
    const toBeDownloadedMb = (downloaded / 1024 / 1024).toFixed(2);
    const downloadedMb = (total / 1024 / 1024).toFixed(2);
    if (toBeDownloadedMb % 1 == 0) {
      // spinner.text doesnt seem to work for me?
      spinner.info(
        `Downloaded ${toBeDownloadedMb}/${downloadedMb} MB - ${youtubeLink}`,
      );
    }
  });

  ffmpeg(download)
    .audioBitrate(256)
    .save(`${output}`)
    .format('mp3')
    .on('end', () => {
      spinner.succeed('Download completed.');
      if (typeof callback === 'function') callback();
    });
};

module.exports = downloader;
