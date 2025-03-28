import { execSync } from 'child_process';
import path from 'path';

import meow from 'meow';

import urlParser from '../util/url-parser.js';
import { removeQuery } from '../util/filters.js';
import Constants from '../util/constants.js';
import Config from '../config.js';
import versionChecker from '../util/version-checker.js';
import { logFailure } from '../util/log-helper.js';

const ffmpegSetup = function (platform_name) {
  try {
    switch (platform_name) {
      case 'win32': {
        if (execSync('where ffmpeg').includes('Could not find file')) {
          process.env.PATH = path.resolve(__dirname, 'bin;') + process.env.PATH;
        }
        break;
      }
      case 'linux':
      case 'android':
      case 'darwin':
        if (execSync('which ffmpeg')) {
          execSync('export FFMPEG_PATH=$(which ffmpeg)');
        } else {
          process.exit(-1);
        }
        break;
    }
  } catch (err) {
    logFailure(
      `Couldn't find ffmpeg. Please install https://ffmpeg.org (Error:${err.message})`
    );
    process.exit(-1);
  }
};

export const startup = function () {
  // setup ffmpeg
  ffmpegSetup(process.platform);
  process.on('SIGINT', () => {
    process.exit(1);
  });
  versionChecker();
};

export const cliInputs = function () {
  const loginRequired = (flags, _input) => {
    if (
      (flags.savedAlbums ||
        flags.savedPlaylists ||
        flags.savedShows ||
        flags.savedSongs) &&
      !Config.isTTY
    ) {
      return true;
    }

    return false;
  };

  const flagsConfig = Config.flags;

  // if you add a new flag make sure to add the default to the config
  const flags = {
    help: {
      shortFlag: 'h',
      helpText: ['--help or --h', '* returns help', 'eg. $ spotifydl --h'],
    },
    version: {
      shortFlag: 'v',
      helpText: [
        '--version or --v',
        '* returns the current version',
        'eg. $ spotifydl --v',
      ],
    },
    cacheFile: {
      shortFlag: 'cf',
      type: 'string',
      default: flagsConfig.cacheFile,
      helpText: [
        '--cache-file "<file-path>" or --cf "<file-path>"',
        '-takes relative or absolute file path argument',
        'eg. $ spotifydl --cf ~/songs.txt <url>',
      ],
    },
    cookieFile: {
      shortFlag: 'cof',
      type: 'string',
      default: flagsConfig.cookieFile,
      helpText: [
        '--cookie-file "<file-path>" or --cof "<file-path>"',
        '-takes relative or absolute file path argument',
        '- defaults to cookies.txt',
        'eg. $ spotifydl --cof ~/cookies.txt <url>',
      ],
    },
    downloadReport: {
      shortFlag: 'dr',
      type: 'boolean',
      default: flagsConfig.downloadReport,
      helpText: [
        '--download-report or --dr',
        '-displays an output at the end of all failed items',
        'NOTE: uses alot of ram',
        '-defaults to false',
        'eg. $ spotifydl --dr false <url>',
      ],
    },
    output: {
      shortFlag: 'o',
      type: 'string',
      default: flagsConfig.output,
      helpText: [
        '--output "<path>" or --o "<path>"',
        '-takes valid path argument',
        'eg. $ spotifydl --o ~/songs <url>',
      ],
    },
    extraSearch: {
      shortFlag: 'es',
      type: 'string',
      default: flagsConfig.extraSearch,
      helpText: [
        '--extra-search "<term>" or --es "<term>"',
        '* takes string for extra search term which gets combined \
            to the song search on youtube',
        '* with playlist and albums it will concat with each song.',
        'eg. $ spotifydl <url> --extra-search "lyrics"',
      ],
    },
    login: {
      shortFlag: 'l',
      type: 'boolean',
      default: flagsConfig.login,
      helpText: [
        '--login or -l',
        '* will perform a spotify login in an external window for permission',
        '* allows spotify premium access restricted things',
        'eg. $ spotifydl --l',
      ],
    },
    username: {
      shortFlag: 'u',
      type: 'string',
      default: flagsConfig.username,
      isRequired: loginRequired,
      helpText: [
        '--username "<username>" or --u "<username>"',
        '* takes string for spotify username',
        '* optional when tty',
        '* required when using --sa, --sp and --st in non tty',
        '* requires using --l/--login once to grant app permissions',
        'eg. $ spotifydl --u "username"',
      ],
    },
    password: {
      shortFlag: 'p',
      type: 'string',
      default: flagsConfig.password,
      isRequired: loginRequired,
      helpText: [
        '--password "<password>" or --p "<password>"',
        '* takes string for spotify password',
        '* optional when tty',
        '* required when using --sa, --sp and --st in non tty',
        '* requires using --l/--login once to grant app permissions',
        'eg. $ spotifydl --p "password"',
      ],
    },
    savedAlbums: {
      shortFlag: 'sa',
      type: 'boolean',
      default: flagsConfig.savedAlbums,
      helpText: [
        '--saved-albums or --sa',
        '* downloads a users saved albums',
        '* username and password required for non TTY',
        'eg. $ spotifydl --u "username" --p "password" --sa',
        'eg. $ spotifydl --sa',
      ],
    },
    savedShows: {
      shortFlag: 'ss',
      type: 'boolean',
      default: flagsConfig.savedShows,
      helpText: [
        '--saved-shows or --ss',
        '* downloads a users saved shows',
        '* username and password required for non TTY',
        'eg. $ spotifydl --u "username" --p "password" --ss',
        'eg. $ spotifydl --ss',
      ],
    },
    savedPlaylists: {
      shortFlag: 'sp',
      type: 'boolean',
      default: flagsConfig.savedPlaylists,
      helpText: [
        '--saved-playlists or --sp',
        '* downloads a users saved playlists',
        '* username and password required for non TTY',
        'eg. $ spotifydl --u "username" --p "password" --sp',
        'eg. $ spotifydl --sp',
      ],
    },
    savedTracks: {
      shortFlag: 'st',
      type: 'boolean',
      default: flagsConfig.savedTracks,
      helpText: [
        '--saved-tracks or --st',
        '* downloads a users saved tracks',
        '* username and password required for non TTY',
        'eg. $ spotifydl --st',
        'eg. $ spotifydl --u "username" --p "password" --st',
      ],
    },
    outputOnly: {
      shortFlag: 'oo',
      default: flagsConfig.outputOnly,
      type: 'boolean',
      helpText: [
        '--output-only or --oo',
        '* saves all songs directly to the output dir',
        'eg. $ spotifydl --oo',
      ],
    },
    downloadLyrics: {
      shortFlag: 'dl',
      default: flagsConfig.downloadLyrics,
      type: 'boolean',
      helpText: [
        '--downloadLyrics or --dl',
        '* Enables saving of the lyrics for the downloaded songs',
        'eg. $ spotifydl --dl',
      ],
    },
    searchFormat: {
      shortFlag: 'sf',
      default: flagsConfig.searchFormat,
      type: 'string',
      helpText: [
        '--search-format or --sf',
        '* allows for a user provided template to be used in the search of youtube api',
        '* supports the following contexts `albumName`, `artistName`,`itemName`',
        '* note `itemName` references the search i.e track/show',
        '* if not provided or no relevant matches are found will ' +
        'fallback to "{itemName} - {albumName}" then "{itemName} - {artistName}"',
        'eg. $ spotifydl --sf  "something {itemName} - {albumName} anyrandomextrastring"',
      ],
    },
    outputFormat: {
      shortFlag: 'of',
      default: flagsConfig.outputFormat,
      type: 'string',
      helpText: [
        '--output-format or --of',
        '* allows for a user provided template to be used for the output filename',
        '* supports the following contexts `albumName`, `artistName`,`itemName`',
        '* note `itemName` references the search i.e track/show',
        '* note the output argument is prepended to this argument',
        '* note ___ is used to signify a directory',
        '* if not provided will fallback to "{artistName}___{albumName}___{itemName}"',
        'eg. $ spotifydl --of  "some_extra_dir___{artistName}___{albumName}___{itemName}"',
      ],
    },
    exclusionFilters: {
      shortFlag: 'ef',
      default: flagsConfig.exclusionFilters,
      type: 'string',
      helpText: [
        '--exclusion-filters or --ef',
        '* allows for a comma separated string of exclusion filters',
        '* each filter will be checked against the description and title if found the link will be ignored',
        'eg. $ spotifydl --ef  "live,concert"',
      ],
    },
    outputFileType: {
      shortFlag: 'oft',
      default: flagsConfig.outputFileType,
      type: 'string',
      choices: ['mp3', 'flac', 'wav', 'aac'],
      helpText: [
        '--output-file-type or --oft',
        '* lets you decide what type of file to output as',
        '* defaults to mp3',
        'eg. $ spotifydl --oft  "mp3"',
      ],
    },
  };

  const helpText =
    '\n' +
    Object.values(flags).reduce(
      (acc, flag) => `${acc}${flag.helpText.join('\n  ')}\n\n`,
      ''
    );

  const cli = meow(
    `
      Usage
          $ spotifydl [Options] <link> …
    
      Examples
          $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
          $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI
          $ spotifydl https://open.spotify.com/album/32Epx6wQXSulDr24Ez6vTE
          $ spotifydl https://open.spotify.com/artist/3vn7rk7VNMfDhuZNB9sDYP
          $ spotifydl --u username --p password --sa
          $ spotifydl --sp
          $ spotifydl --st
          $ spotifydl <link> --cf <cache-file>
    
      Options
      ${helpText}    
    `,
    {
      importMeta: import.meta,
      flags: flags,
    }
  );

  const { flags: inputFlags } = cli;
  let { input: inputs } = cli;

  inputs = inputs.map(link => {
    const cleanedURL = removeQuery(link);

    return {
      type: urlParser(cleanedURL),
      // only use cleaned url for spotify to not break youtube support
      url: link.includes('spotify') ? cleanedURL : link,
    };
  });

  if (inputFlags.savedAlbums) {
    inputs.push({ type: Constants.INPUT_TYPES.SONG.SAVED_ALBUMS, url: null });
  }
  if (inputFlags.savedTracks) {
    inputs.push({ type: Constants.INPUT_TYPES.SONG.SAVED_TRACKS, url: null });
  }
  if (inputFlags.savedPlaylists) {
    inputs.push({
      type: Constants.INPUT_TYPES.SONG.SAVED_PLAYLISTS,
      url: null,
    });
  }
  if (inputFlags.savedShows) {
    inputs.push({ type: Constants.INPUT_TYPES.EPISODE.SAVED_SHOWS, url: null });
  }

  if (!inputs.length) {
    console.log(
      'No spotify url provided for scaping, See spotifydl --help for instructions'
    );
    process.exit(1);
  }

  return {
    inputs: inputs,
    extraSearch: inputFlags.extraSearch,
    output: inputFlags.output,
    cacheFile: inputFlags.cacheFile,
    cookieFile: inputFlags.cookieFile,
    downloadReport: inputFlags.downloadReport,
    outputOnly: inputFlags.outputOnly,
    searchFormat: inputFlags.searchFormat,
    exclusionFilters: inputFlags.exclusionFilters.split(',').filter(x => x),
    login: inputFlags.login,
    username: inputFlags.username,
    password: inputFlags.password,
    downloadLyrics: inputFlags.downloadLyrics,
    outputFormat: inputFlags.outputFormat,
    outputFileType: inputFlags.outputFileType,
  };
};
