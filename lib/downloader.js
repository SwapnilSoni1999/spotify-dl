'use strict';
const ytdl = require('ytdl-core');
const options = require('../config');
const ffmpeg = require('fluent-ffmpeg');

/**
 * This function downloads the given youtube video 
 * in best audio format as mp3 file
 *
 * @param {array} youtubeLinks array of links of youtube videos
 * @param {string} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 */
const downloader = async (youtubeLinks, output, spinner) => {
  const progressFunction = (_, downloaded, total) => {
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
  };
  let attemptCount = 0;
  while (attemptCount < youtubeLinks.length) {
    const download = ytdl(youtubeLinks[attemptCount], options);
    spinner.start(`Trying youtube link ${attemptCount + 1}...`);
    download.on('progress', progressFunction);
    const doDownload = (resolve, reject) => {
      ffmpeg()
        .on('error', e => {
          reject(e);
        })
        .on('end', () => {
          resolve();
        })
        .input(download)
        .audioBitrate(256)
        .save(`${output}`)
        .format('mp3');
    };

    try {
      await new Promise(doDownload);
      attemptCount = youtubeLinks.length;
    } catch (e) {
      spinner.info(e.message);
      spinner.info('Youtube error retrying download');
      attemptCount++;
    }
  }
  spinner.succeed('Download completed.');
};

module.exports = downloader;
