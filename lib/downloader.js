'use strict';
const ytdl = require('ytdl-core');
const { youtubeDLConfig } = require('../config');
const ffmpeg = require('fluent-ffmpeg');
const { SponsorBlock } = require('sponsorblock-api');
const sponsorBlock = new SponsorBlock(1234);
const {
  SPONSOR_BLOCK: {
    CATEGORIES: {
      SPONSOR,
      INTRO,
      OUTRO,
      INTERACTION,
      SELF_PROMO,
      MUSIC_OFF_TOPIC,
    },
  },
  FFMPEG: {
    ASET,
  },
} = require('../util/constants');

const sponsorComplexFilter = async link => {
  const videoID = (new URLSearchParams((new URL(link)).search)).get('v');
  let segments = [];
  let complexFilter = null;
  try {
    segments = (await sponsorBlock.getSegments(
      videoID,
      SPONSOR,
      INTRO,
      OUTRO,
      INTERACTION,
      SELF_PROMO,
      MUSIC_OFF_TOPIC,
    )).sort((a, b) => a.startTime - b.startTime)
      .reduce((acc, { startTime, endTime }) => {
        const previousSegment = acc[acc.length - 1];
        // if segments overlap merge
        if (previousSegment && previousSegment.endTime > startTime) {
          acc[acc.length - 1].endTime = endTime;
        } else {
          acc.push({ startTime, endTime });
        }
        return acc;
      }, []);
    // we have to catch as it throws if none found
  } catch (_) { }
  const segmentLength = segments.length;
  if (segmentLength) {
    // 0 -> start1 , end1 -> start2, end2
    // we want everything but the segment `start -> end`
    complexFilter = segments.map((segment, i) => {
      const startString = `start=${i ? segments[i - 1].endTime : 0}`;
      const endString = `:end=${segment.startTime}`;
      return `[0:a]atrim=${startString}${endString},${ASET}[${i}a];`;
    });
    complexFilter.push(`[0:a]atrim=start=${segments[segmentLength - 1].endTime}`
      + `,${ASET}[${segmentLength}a];`);
    complexFilter.push(`${complexFilter.map((_, i) => `[${i}a]`).join('')}` +
      `concat=n=${segmentLength + 1}:v=0:a=1[outa]`);
    complexFilter = complexFilter.join('\n');
  }
  return complexFilter;
};

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
    const link = youtubeLinks[attemptCount];
    const download = ytdl(link, youtubeDLConfig);
    spinner.start(`Trying youtube link ${attemptCount + 1}...`);
    download.on('progress', progressFunction);
    const complexFilter = await sponsorComplexFilter(link);
    const doDownload = (resolve, reject) => {
      const ffmpegCommand = ffmpeg();
      if (complexFilter) {
        ffmpegCommand
          .complexFilter(complexFilter)
          .map('[outa]');
      }
      ffmpegCommand
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
