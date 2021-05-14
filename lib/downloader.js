'use strict';
const ytdl = require('ytdl-core');
const options = require('../config');
const ffmpeg = require('fluent-ffmpeg');

/**
 * This function downloads the given youtube video 
 * in best audio format as mp3 file
 *
 * @param {string} youtubeLink link of youtube video
 * @param {string} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 */
const downloader = async (youtubeLink, output, spinner) => {
  const download = ytdl(youtubeLink, options);
  spinner.start('Downloading...');
  download.on('progress', (_, downloaded, total) => {
    const toBeDownloadedMb = (downloaded / 1024 / 1024).toFixed(2);
    const downloadedMb = (total / 1024 / 1024).toFixed(2);
    const isTTY = process.stdout.isTTY;
    if (isTTY) {
      spinner.text =
        `Downloaded ${toBeDownloadedMb}/${downloadedMb} MB`;
    }
    else if (toBeDownloadedMb % 1 == 0 || toBeDownloadedMb == downloadedMb) {
      spinner.info(
        `Downloaded ${toBeDownloadedMb}/${downloadedMb} MB`,
      );
    }
  });

  await new Promise((resolve, reject) => {
    ffmpeg()
      .on('error', err => {
        reject(err);
      })
      .on('end', () => {
        resolve();
      })
      .input(download)
      .audioBitrate(256)
      .save(`${output}`)
      .format('mp3');
  });
  spinner.succeed('Download completed.');
};

module.exports = downloader;
