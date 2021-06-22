#!/usr/bin/env node

/*
  Copyright (c) 2021 Swapnil Soni

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
*/

const path = require('path');
const ora = require('ora');
const getLinks = require('./util/get-link');
const SpotifyExtractor = require('./util/get-songdata');
const filter = require('./util/filters');
const {
  INPUT_TYPES,
} = require('./util/constants');

const downloader = require('./lib/downloader');
const cache = require('./lib/cache');
const mergeMetadata = require('./lib/metadata');
const { ffmpegSetup, cliInputs } = require('./lib/setup');
const versionChecker = require('./util/versionChecker');
// set to 55 minutes expires every 60 minutes
const REFRESH_ACCESS_TOKEN_SECONDS = 55 * 60;

// setup ffmpeg
ffmpegSetup(process.platform);

const { inputs, extraSearch, output, outputOnly } = cliInputs();

let outputDir;
let nextTokenRefreshTime;
const spotifyExtractor = new SpotifyExtractor();
const spinner = ora('Searching… Please be patient :)\n').start();

const verifyCredentials = async () => {
  if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
    nextTokenRefreshTime = new Date();
    nextTokenRefreshTime.setSeconds(
      nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS,
    );
    await spotifyExtractor.checkCredentials();
  }
};

const trackOutputDir = track => {
  return outputOnly ? outputDir : path.join(
    outputDir,
    filter.cleanOutputPath(track.artist_name),
    filter.cleanOutputPath(track.album_name),
  );
};

const downloadLoop = async list => {
  const tracks = list.tracks;
  const remainingTracks = tracks.filter(track => !track.cached);
  const tracksCount = tracks.length;
  const remainingTracksCount = remainingTracks.length;
  const currentCount = tracksCount - remainingTracksCount + 1;
  if (!remainingTracksCount) {
    spinner.succeed(`All songs already downloaded for ${list.name}!\n`);
  } else {
    const nextTrack = remainingTracks[0];
    const trackDir = trackOutputDir(nextTrack);
    const trackId = nextTrack.id;
    const trackName = nextTrack.name;
    const artistName = nextTrack.artist_name;
    spinner.info(
      [
        `${currentCount}/${tracksCount}`,
        `Artist: ${artistName}`,
        `Album: ${nextTrack.album_name}`,
        `Song: ${trackName}`,
      ].join('\n'),
    );
    // use provided URL or find list of urls given info provided
    const ytLinks = nextTrack.URL ? [nextTrack.URL] : await getLinks(
      `${trackName} ${artistName} ${extraSearch}`,
    );
    const output = path.resolve(
      trackDir,
      `${filter.cleanOutputPath(trackName)}.mp3`,
    );
    await downloader(ytLinks, output, spinner);
    await mergeMetadata(output, nextTrack, spinner);
    cache.writeId(trackDir, trackId);
    list.tracks = list.tracks.map(track => {
      if (track.id == trackId) {
        track.cached = true;
      }
      return track;
    });
    await downloadLoop(list);
  }
};

const downloadList = async list => {
  list.name = list.name.replace('/', '-');
  spinner.info(`Downloading: ${list.name}`);
  spinner.info(`Total Songs: ${list.tracks.length}`);
  list.tracks = list.tracks.map(track => {
    track.cached = cache.findId(track.id, trackOutputDir(track));
    return track;
  });
  await downloadLoop(list);
};

const run = async () => {
  for (const input of inputs) {
    const URL = input.url;
    outputDir = path.normalize(output);
    await verifyCredentials();
    switch (input.type) {
      case INPUT_TYPES.SONG: {
        const track = await spotifyExtractor.getTrack(URL);
        await downloadList({
          tracks: [
            track,
          ],
          name: `${track.name} ${track.artist_name}`,
        });
        break;
      }
      case INPUT_TYPES.PLAYLIST: {
        await downloadList(
          await spotifyExtractor.getPlaylist(URL),
        );
        break;
      }
      case INPUT_TYPES.ALBUM: {
        await downloadList(
          await spotifyExtractor.getAlbum(URL),
        );
        break;
      }
      case INPUT_TYPES.ARTIST: {
        const artistAlbumInfos = await spotifyExtractor.getArtistAlbums(URL);
        for (let x = 0; x < artistAlbumInfos.length; x++) {
          spinner.info(`Starting album ${x + 1}/${artistAlbumInfos.length}`);
          await downloadList(artistAlbumInfos[x]);
        }
        break;
      }
      case INPUT_TYPES.SAVED_ALBUMS: {
        const savedAlbumsInfo = await spotifyExtractor.getSavedAlbums();
        for (let x = 0; x < savedAlbumsInfo.length; x++) {
          spinner.info(`Starting album ${x + 1}/${savedAlbumsInfo.length}`);
          await downloadList(savedAlbumsInfo[x]);
        }
        break;
      }
      case INPUT_TYPES.SAVED_PLAYLISTS: {
        const savedPlaylistsInfo = await spotifyExtractor.getSavedPlaylists();
        for (let x = 0; x < savedPlaylistsInfo.length; x++) {
          spinner.info(
            `Starting playlist ${x + 1}/${savedPlaylistsInfo.length}`,
          );
          await downloadList(savedPlaylistsInfo[x]);
        }
        break;
      }
      case INPUT_TYPES.SAVED_TRACKS: {
        await downloadList(await spotifyExtractor.getSavedTracks());
        break;
      }
      case INPUT_TYPES.YOUTUBE: {
        await downloadList({
          tracks: [
            {
              name: URL,
              artist_name: '',
              album_name: URL,
              release_date: null,
              //todo can we get the youtube image?
              cover_url: 'https://lh3.googleusercontent.com/z6Sl4j9zQ88oUKN \
              y0G3PAMiVwy8DzQLh_ygyvBXv0zVNUZ_wQPN_n7EAR2By3dhoUpX7kTpaHjRP \
              ni1MHwKpaBJbpNqdEsHZsH4q',
              id: URL,
              URL: URL,
            },
          ],
          name: URL,
        });
        break;
      }
      default: {
        throw new Error('Invalid URL type');
      }
    }
  }
};

process.on('SIGINT', () => {
  process.exit(1);
});

versionChecker();

try {
  run();
} catch (error) {
  spinner.fail('Something went wrong!');
  console.log(error);
  process.exit(1);
}