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

const download = require('./lib/downloader');
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
  const spinner = ora('Searching…');
  let outputDir;
  const spotifyExtractor = new SpotifyExtractor();

  const update = await versionChecker();
  if (update) {
    console.log(update);
  }
  spinner.start();
  try {
    const downloadLoop = async (listData, dir, counter = 0) => {
      const trackIds = listData.tracks;
      if (counter == trackIds.length) {
        spinner.succeed(`All songs already downloaded for ${dir}!\n`);
      } else {
        const songInfo = await spotifyExtractor.extractTrack(
          trackIds[counter],
        );
        spinner.info(
          `${counter + 1}. Song: ${songInfo.name}` +
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
        spinner.start('Downloading...');
        spinner.info(`DIR: ${listData.name}`);
        await download(ytLink, output, spinner, async () => {
          await cache.write(path.join(dir, '.spdlcache'), ++counter);
          await mergeMetadata(output, songInfo, spinner, async () => {
            await downloadLoop(listData, dir, counter);
          });
        });
      }
    };

    const downloadSongList = async listData => {
      listData.name = listData.name.replace('/', '-');
      var dir = path.join(
        outputDir,
        filter.validateOutputSync(listData.name),
      );

      spinner.info(`Total Songs: ${listData.total_tracks}`);
      spinner.info(`Saving: ${path.join(outputDir, listData.name)}`);

      cacheCounter = await cache.read(dir, spinner);

      await downloadLoop(listData, dir, cacheCounter);
    };

    for (const link of input) {
      const urlType = await urlParser(await filter.removeQuery(link));
      const URL = link;
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
            await downloadSongList(albums[x]);
          }
          break;
        }
        case 'youtube': {
          spinner.start('Downloading...');
          const cleanedURL = filter.validateOutputSync(URL);
          let dir = path.join(
            outputDir,
            cleanedURL,
          );
          // this is just a dirty folder creation
          await cache.read(dir, spinner);
          dir = path.join(
            dir,
            `${cleanedURL}.mp3`,
          );

          await download(URL, dir, spinner);
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
