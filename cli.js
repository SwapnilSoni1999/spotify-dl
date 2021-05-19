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
const getLink = require('./util/get-link');
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

const { inputs, extraSearch, output } = cliInputs();

let outputDir;
let nextTokenRefreshTime;
const spotifyExtractor = new SpotifyExtractor();
const spinner = ora('Searching…\n').start();

const verifyCredentials = async () => {
  if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
    nextTokenRefreshTime = new Date();
    nextTokenRefreshTime.setSeconds(
      nextTokenRefreshTime.getSeconds() + REFRESH_ACCESS_TOKEN_SECONDS,
    );
    await spotifyExtractor.checkCredentials();
  }
};

const downloadLoop = async (listData, dir) => {
  const tracks = listData.tracks;
  const remainingTracks = tracks.filter(track => !track.cached);
  const tracksCount = tracks.length;
  const remainingTracksCount = remainingTracks.length;
  const currentCount = tracksCount - remainingTracksCount + 1;
  if (!remainingTracksCount) {
    spinner.succeed(`All songs already downloaded for ${dir}!\n`);
  } else {
    // check if we need to reverify before each song
    await verifyCredentials();
    const trackId = remainingTracks[0].id;
    const songInfo = await spotifyExtractor.extractTrack(
      trackId,
    );
    spinner.info(`Folder: ${listData.name}`);
    spinner.info(
      `${currentCount}/${tracksCount} Song: ${songInfo.name}` +
      ` - ${songInfo.artists[0]}`,
    );
    const ytLink = await getLink(
      `${songInfo.name} ${songInfo.artists[0]} ${extraSearch}`,
    );
    const output = path.resolve(
      dir,
      filter.validateOutputSync(
        `${songInfo.name} - ${songInfo.artists[0]}.mp3`,
      ),
    );
    await downloader(ytLink, output, spinner);
    await cache.write(dir, trackId);
    await mergeMetadata(output, songInfo, spinner);
    listData.tracks = listData.tracks.map(track => {
      if (track.id == trackId) {
        track.cached = true;
      }
      return track;
    });
    await downloadLoop(listData, dir);
  }
};

const downloadSongList = async listData => {
  listData.name = listData.name.replace('/', '-');
  var dir = path.join(
    outputDir,
    filter.validateOutputSync(listData.name),
  );

  spinner.info(`Total Songs: ${listData.total_tracks}`);
  spinner.info(`Saving: ${dir}`);

  const cacheFile = await cache.read(dir, spinner);
  const cachedIds = (cacheFile && cacheFile.split('\n')
    .map(line => line.replace('spotify ', ''))) || [];

  listData.tracks = listData.tracks.map(track => ({
    id: track,
    cached: cachedIds.find(id => id == track) && true,
  }));
  await downloadLoop(listData, dir);
};

const run = async () => {
  for (const input of inputs) {
    const URL = input.url;
    outputDir = path.normalize(output);
    await verifyCredentials();
    switch (input.type) {
      case INPUT_TYPES.SONG: {
        const songData = await spotifyExtractor.getTrack(URL);
        const listData = {
          total_tracks: 1,
          tracks: [
            songData.id,
          ],
          name: songData.name + ' ' + songData.artists[0],
        };
        await downloadSongList(listData);
        break;
      }
      case INPUT_TYPES.PLAYLIST: {
        await downloadSongList(
          await spotifyExtractor.getPlaylist(URL),
        );
        break;
      }
      case INPUT_TYPES.ALBUM: {
        await downloadSongList(
          await spotifyExtractor.getAlbum(URL),
        );
        break;
      }
      case INPUT_TYPES.ARTIST: {
        const artistAlbumInfos = await spotifyExtractor
          .getArtistAlbums(URL);
        const artist = artistAlbumInfos.artist;
        const albums = artistAlbumInfos.albums;
        outputDir = path.join(outputDir, artist.name);
        for (let x = 0; x < albums.length; x++) {
          spinner.info(`Starting album ${x + 1}/${albums.length}`);
          await downloadSongList(albums[x]);
        }
        break;
      }
      case INPUT_TYPES.SAVED_ALBUMS: {
        const savedAlbumsInfo = await spotifyExtractor
          .getSavedAlbums(URL);
        // const artist = artistAlbumInfos.artist;
        // const albums = artistAlbumInfos.albums;
        // outputDir = path.join(outputDir, artist.name);
        // for (let x = 0; x < albums.length; x++) {
        //   spinner.info(`Starting album ${x + 1}/${albums.length}`);
        //   await downloadSongList(albums[x]);
        // }
        break;
      }
      case INPUT_TYPES.SAVED_PLAYLISTS: {
        const savedPlaylistsInfo = await spotifyExtractor
          .getSavedPlaylists(URL);
      }
      case INPUT_TYPES.SAVED_TRACKS: {
        const savedTracksInfo = await spotifyExtractor
          .getSavedTracks(URL);
      }
      case INPUT_TYPES.YOUTUBE: {
        const cleanedURL = filter.validateOutputSync(URL);
        let dir = path.join(
          outputDir,
          cleanedURL,
        );
        const cacheFile = await cache.read(dir, spinner);
        //assume if cache file then it was downloaded
        if (!cacheFile) {
          const output = path.join(
            dir,
            `${cleanedURL}.mp3`,
          );

          await downloader(URL, output, spinner);
          await cache.write(dir, URL);
        } else {
          spinner.succeed(`All songs already downloaded for ${URL}!\n`);
        }
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