const { execSync } = require('child_process');
const path = require('path');
const meow = require('meow');
const config = require('../config');
const ora = require('ora');
let spinner


module.exports = {
  ffmpegSetup(platform_name) {
    switch (platform_name) {
      case 'win32': {
        try {
          const ffmpeg_paths = execSync('where ffmpeg');
          if (ffmpeg_paths.includes('Could not find file')) {
            process.env.PATH =
              path.resolve(__dirname, 'bin;') + process.env.PATH;
          }
          break;
        } catch (err) {
          console
            .log('Couldn\'t find ffmpeg. Please install https://ffmpeg.org');
        }
        break;
      }
      case 'linux':
      case 'android':
      case 'darwin':

        try {
          const ffmpeg_paths = execSync('which ffmpeg');
          if (ffmpeg_paths == null) {
            console.error('ERROR: Cannot find ffmpeg! Install it first, \
             why don\'t you read README.md on git!');
            process.exit(-1);
          }
          else {
            execSync('export FFMPEG_PATH=$(which ffmpeg)');
          }

          break;
        } catch (error) {
          console
            .log('Couldn\'t find ffmpeg. Please install https://ffmpeg.org');
        }
    }
  },
  cliInputs() {
    const loginRequired = (flags, input) => {
      if ((flags.savedAlbums ||
        flags.savedPlaylists ||
        flags.savedSongs) && !process.stdout.isTTY
      ) {
        return true;
      }

      return false;
    };

    const flagsConfig = config.flags;

    // if you add a new flag make sure to add the default to the config
    const flags = {
      help: {
        alias: 'h',
        helpText: [
          '--help or -h',
          '* returns help',
          'eg. $ spotifydl -h',
        ],
      },
      version: {
        alias: 'v',
        helpText: [
          '--version or -v',
          '* returns the current version',
          'eg. $ spotifydl -v',
        ],
      },
      cacheFile: {
        alias: 'cf',
        type: 'string',
        default: flagsConfig.cacheFile,
        helpText: [
          '--cache-file "<file-path>" or --cf "<file-path>"',
          '-takes relative or absolute file path argument',
          'eg. $ spotifydl -cf ~/songs.txt <url>',
        ],
      },
      output: {
        alias: 'o',
        type: 'string',
        default: flagsConfig.output,
        helpText: [
          '--output "<path>" or -o "<path>"', '-takes valid path argument',
          'eg. $ spotifydl -o ~/songs <url>',
        ],
      },
      extraSearch: {
        alias: 'es',
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
      username: {
        alias: 'u',
        type: 'string',
        default: flagsConfig.username,
        isRequired: loginRequired,
        helpText: [
          '--username "<username>" or -u "<username>"',
          '* takes string for spotify username',
          '* optional when tty',
          '* required when using -sa, -sp and -st in non tty',
          'eg. $ spotifydl -u "username"',
        ],
      },
      password: {
        alias: 'p',
        type: 'string',
        default: flagsConfig.password,
        isRequired: loginRequired,
        helpText: [
          '--password "<password>" or -p "<password>"',
          '* takes string for spotify password',
          '* optional when tty',
          '* required when using -sa, -sp and -st in non tty',
          'eg. $ spotifydl -p "password"',
        ],
      },
      savedAlbums: {
        alias: 'sa',
        type: 'boolean',
        default: flagsConfig.savedAlbums,
        helpText: [
          '--saved-albums or --sa',
          '* downloads a users saved albums',
          '* username and password required for non TTY',
          'eg. $ spotifydl -u "username" -p "password" -sa',
          'eg. $ spotifydl -sa',
        ],
      },
      savedPlaylists: {
        alias: 'sp',
        type: 'boolean',
        default: flagsConfig.savedPlaylists,
        helpText: [
          '--saved-playlists or --sp',
          '* downloads a users saved playlists',
          '* username and password required for non TTY',
          'eg. $ spotifydl -u "username" -p "password" -sp',
          'eg. $ spotifydl -sp',
        ],
      },
      savedTracks: {
        alias: 'st',
        type: 'boolean',
        default: flagsConfig.savedTracks,
        helpText: [
          '--saved-tracks or --st',
          '* downloads a users saved tracks',
          '* username and password required for non TTY',
          'eg. $ spotifydl -st',
          'eg. $ spotifydl -u "username" -p "password" -st',
        ],
      },
      outputOnly: {
        alias: 'oo',
        default: flagsConfig.outputOnly,
        type: 'boolean',
        helpText: [
          '--outputOnly or --oo',
          '* saves all songs directly to the output dir',
          'eg. $ spotifydl -oo',
        ],
      },
    };

    const helpText = '\n' + Object
      .values(flags)
      .reduce((acc, flag) => `${acc}${flag.helpText.join('\n  ')}\n\n`, '');

    const cli = meow(
      `
      Usage
          $ spotifydl [Options] <link> …
    
      Examples
          $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
          $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI
          $ spotifydl https://open.spotify.com/album/32Epx6wQXSulDr24Ez6vTE
          $ spotifydl https://open.spotify.com/artist/3vn7rk7VNMfDhuZNB9sDYP
          $ spotifydl -u username -p password -sa
          $ spotifydl -sp
          $ spotifydl -st
          $ spotifydl <link> -cf <cache-file>
    
      Options
      ${helpText}    
    `,
      {
        flags: flags,
      },
    );

    const { flags: inputFlags } = cli;
    let { input: inputs } = cli;

    if (!inputs.length) {
      console.log('See spotifydl --help for instructions');
      process.exit(1);
    }

    return {
      inputs: inputs,
      extraSearch: inputFlags.extraSearch,
      output: inputFlags.output,
      cacheFile: inputFlags.cacheFile,
      outputOnly: inputFlags.outputOnly,
      username: inputFlags.username,
      password: inputFlags.password,
      savedAlbums: inputFlags.savedAlbums,
      savedTracks: inputFlags.savedTracks,
      savedPlaylists: inputFlags.savedPlaylists,
    };
  },
  initSpinner(options) {
   spinner = ora(options).start('Searching… Please be patient :)\n');
  },
  getSpinner() {
    return spinner;
  },
};