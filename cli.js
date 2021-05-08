#!/usr/bin/env node

/*
  Copyright (c) 2019 Swapnil Soni

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
const meow = require('meow');
const getLink = require('./util/get-link');
const SpotifyExtractor = require('./util/get-songdata');
const urlParser = require('./util/url-parser');
const filter = require('./util/filters');

const downloader = require('./lib/downloader');
const cache = require('./lib/cache');
const mergeMetadata = require('./lib/metadata');
const setup = require('./lib/setup');
const versionChecker = require('./util/versionChecker');

// setup ffmpeg
setup.ffmpeg(process.platform);

const cli = meow(
  `
  Usage
      $ spotifydl [Options] <link> …

  Examples
      $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
      $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI

  Options
    --output "<path>"            -takes valid path argument 
        or                         eg. $ spotifydl -o ~/songs https://open.spotify.com/playlist/3PrZvfOSNShOC2JxgIhvL1
    -o "<path>"

    --extra-search "<term>"      -takes string for extra search term which gets contcated to song search on youtube
          or                       eg. $ spotifydl <url> --extra-search "lyrics"
    --es "<term>"                -with playlist and albums it will concat with each song.
`,
  {
    flags: {
      help: {
        alias: 'h',
      },
      version: {
        alias: 'v',
      },
      output: {
        alias: 'o',
        type: 'string',
      },
      extraSearch: {
        alias: 'es',
        type: 'string',
      },
    },
  },
);

const { input } = cli;

if (!input[0]) {
  console.log('See spotifydl --help for instructions');
  process.exit(1);
}

(async () => {
  const spinner = ora('Searching…').start();
  let outputDir;
  const spotifyExtractor = new SpotifyExtractor();

  const update = await versionChecker();
  if (update) {
    console.log(update);
  }
  try {
    const downloadLoop = async (listData, dir) => {
      const tracks = listData.tracks;
      const remainingTracks = tracks.filter(track => !track.cached);
      const currentCount = tracks.length - remainingTracks.length;
      if (!remainingTracks.length) {
        spinner.succeed(`All songs already downloaded for ${dir}!\n`);
      } else {
        const trackId = remainingTracks[0].id;
        const songInfo = await spotifyExtractor.extractTrack(
          trackId,
        );
        spinner.info(
          `${currentCount + 1}. Song: ${songInfo.name}` +
          ` - ${songInfo.artists[0]}`,
        );
        const ytLink = await getLink(
          `${songInfo.name} ${songInfo.artists[0]}` +
          (cli.flags.extraSearch ? ` ${cli.flags.extraSearch}` : ''),
        );
        const output = path.resolve(
          dir,
          filter.validateOutputSync(
            `${songInfo.name} - ${songInfo.artists[0]}.mp3`,
          ),
        );
        spinner.info(`DIR: ${listData.name}`);
        await downloader(ytLink, output, spinner);
        await cache.write(path.join(dir, '.spdlcache'), trackId);
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
      const cachedIds = (cacheFile && cacheFile.split('\n')) || [];

      listData.tracks = listData.tracks.map(track => ({
        id: track,
        cached: cachedIds.find(id => id == track) && true,
      }));
      await downloadLoop(listData, dir);
    };

    for (const link of input) {
      const cleanedURL = await filter.removeQuery(link);
      const urlType = await urlParser(cleanedURL);
      // only use cleaned url for spotify to not break youtube support
      const URL = link.includes('spotify') ? cleanedURL : link;
      outputDir = path.normalize(
        (cli.flags.output != null) ? cli.flags.output : process.cwd(),
      );
      switch (urlType) {
        case 'song': {
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
        case 'playlist': {
          await downloadSongList(
            await spotifyExtractor.getPlaylist(URL),
          );
          break;
        }
        case 'album': {
          await downloadSongList(
            await spotifyExtractor.getAlbum(URL),
          );
          break;
        }
        case 'artist': {
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
        case 'youtube': {
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
            await cache.write(path.join(dir, '.spdlcache'), URL);
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
  } catch (error) {
    spinner.fail('Something went wrong!');
    console.log(error);
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
