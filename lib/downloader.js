import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { SponsorBlock } from 'sponsorblock-api';

import Config from '../config.js';
import { cliInputs } from './setup.js';
import Constants from '../util/constants.js';
import {
  logStart,
  updateSpinner,
  logInfo,
  logSuccess,
} from '../util/log-helper.js';

const { youtubeDLConfig, isTTY } = Config;
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
  FFMPEG: { ASET, TIMEOUT_MINUTES },
} = Constants;

const sponsorComplexFilter = async link => {
  const videoID = new URLSearchParams(new URL(link).search).get('v');
  let segments = [];
  let complexFilter = null;
  try {
    segments = (
      await sponsorBlock.getSegments(
        videoID,
        SPONSOR,
        INTRO,
        OUTRO,
        INTERACTION,
        SELF_PROMO,
        MUSIC_OFF_TOPIC,
      )
    )
      .sort((a, b) => a.startTime - b.startTime)
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
  } catch (_) {}
  const segmentLength = segments.length;
  if (segmentLength) {
    // 0 -> start1 , end1 -> start2, end2
    // we want everything but the segment `start -> end`
    complexFilter = segments.map((segment, i) => {
      const startString = `start=${i ? segments[i - 1].endTime : 0}`;
      const endString = `:end=${segment.startTime}`;
      return `[0:a]atrim=${startString}${endString},${ASET}[${i}a];`;
    });
    complexFilter.push(
      `[0:a]atrim=start=${segments[segmentLength - 1].endTime}` +
        `,${ASET}[${segmentLength}a];`,
    );
    complexFilter.push(
      `${complexFilter.map((_, i) => `[${i}a]`).join('')}` +
        `concat=n=${segmentLength + 1}:v=0:a=1[outa]`,
    );
    complexFilter = complexFilter.join('\n');
  }
  return complexFilter;
};

const progressFunction = (_, downloaded, total) => {
  const downloadedMb = (downloaded / 1024 / 1024).toFixed(2);
  const toBeDownloadedMb = (total / 1024 / 1024).toFixed(2);
  const downloadText = `Downloaded ${downloadedMb}/${toBeDownloadedMb} MB`;
  if (isTTY || downloadedMb % 1 == 0 || toBeDownloadedMb == downloadedMb) {
    updateSpinner(downloadText);
  }
};

const getYoutubeDLConfig = () => {
  const { cookieFile } = cliInputs();
  if (fs.existsSync(cookieFile)) {
    const cookieFileContents = fs
      .readFileSync(cookieFile, 'utf-8')
      .split('\n')
      .reduce((cookie, line) => {
        const segments = line.split(/[\t]+|[ ]+/);
        if (segments.length == 7) {
          cookie += `${segments[5]}=${segments[6]}; `;
        }
        return cookie;
      }, '')
      .trim();
    youtubeDLConfig.requestOptions = {
      headers: {
        Cookie: cookieFileContents,
      },
    };
  }
  return youtubeDLConfig;
};

/**
 * This function downloads the given youtube video
 * in best audio format as mp3 file
 *
 * @param {array} youtubeLinks array of links of youtube videos
 * @param {string} output path/name of file to be downloaded(songname.mp3)
 */
const downloader = async (youtubeLinks, output) => {
  const { outputFileType } = cliInputs();
  let attemptCount = 0;
  let downloadSuccess = false;
  while (attemptCount < youtubeLinks.length && !downloadSuccess) {
    const link = youtubeLinks[attemptCount];
    logStart(`Trying youtube link (${link}) ${attemptCount + 1}...`);
    const complexFilter = await sponsorComplexFilter(link);

    const doDownload = (resolve, reject) => {
      const download = ytdl(link, getYoutubeDLConfig());
      download.on('progress', progressFunction);
      const ffmpegCommand = ffmpeg({ timeout: TIMEOUT_MINUTES * 60 });
      if (complexFilter) {
        ffmpegCommand.complexFilter(complexFilter).map('[outa]');
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
        .format(outputFileType);
    };

    try {
      await new Promise(doDownload);
      downloadSuccess = true;
      logSuccess(`Download completed (${output}).`);
    } catch (e) {
      logInfo(e.message);
      logInfo('Youtube error retrying download');
      attemptCount++;
    }
  }

  return downloadSuccess;
};

export default downloader;
