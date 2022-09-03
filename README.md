# Spotify Downloader 
<p align="center">
  <img src="./logo.png" height="200px"/>
  <br><br>
  <b>Download audio files from spotify links(Based on: youtube-dl)</b>
  <br>
</p>

&nbsp;

#### Required
Get [FFMPEG](https://ffmpeg.org/download.html)

(Node.js 14)[https://nodejs.org/en/download/package-manager/]

Note: if you run into issues related to puppeteer chromium download please try `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install -g spotify-dl`

#### spotifydl

A simple commandline utility that allows you to download Spotify Songs, Shows, Episodes, Playlists and Albums from Youtube.

PLEASE NOTE: 
* The ability to find a video is dependent on the fact it is hosted on youtube, and even then there is a chance it is still incorrectly matched
* Some items may only be available to spotify premium users, please be sure to provide a username and password when this is the case

<hr>

# Installation

#### NPM

Install from [npm](https://www.npmjs.com/package/spotify-dl) registry

```sh
npm install -g spotify-dl
```
or You can do manually
```sh
git clone https://github.com/SwapnilSoni1999/spotify-dl
cd spotify-dl
npm install
npm link
```

#### Android (Termux)
PS: You may need to type `termux-setup-storage` first and allow storage permission
```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/SwapnilSoni1999/spotify-dl/master/tools/termux.sh)"
```

#### Docker

Build docker image:
```sh
git clone https://github.com/SwapnilSoni1999/spotify-dl
cd spotify-dl
docker build -t spotify-dl .
```

<hr>

# Usage

To download highest quality audio file
```sh
spotifydl <spotify track/album/playlist link> ...
```

&nbsp;

Example
```sh
$ spotifydl https://open.spotify.com/track/xyz

```

#### Options
| Flag  | Long Flag           | Usage                                                                                           |
| ----- | ------------------- | ----------------------------------------------------------------------------------------------- |
| --o   | --output            | takes valid output path argument                                                                |
| --es  | --extra-search      | takes extra search string/term to be used for youtube search                                    |
| --oo  | --output-only       | enforces all downloaded songs in the output dir                                                 |
| --sf  | --search-format     | provide template for youtube api, supports `albumName`, `artistName`,`itemName`                 |
|       |                     | "something {itemName} - {albumName} anyrandomextrastring"                                       |
| --ef  | --exclusion-filters | comma separated string of exclusion filters                                                     |
|       |                     | each filter will be checked against the description and title if found the link will be ignored |
| --st  | --saved-tracks      | download spotify saved tracks                                                                   |
| --ss  | --saved-songs       | download spotify saved shows                                                                    |
| --sp  | --saved-playlists   | download spotify saved playlists                                                                |
| --sa  | --saved-albums      | download spotify saved albums                                                                   |
| --l   | --login             | Requests a login in an external window (non tty should use --u and --p)                         |
| --u   | --username          | spotify username for headless long (Note: you must use --login once to grant access)            |
| --p   | --password          | spotify password                                                                                |
| --cf  | --cache-file        | takes valid output file name path argument                                                      |
| --dr  | --download-report   | output a download report of what files failed                                                   |
| --cof | --cookie-file       | takes valid file name path argument to a txt file for youtube cookies                           |
| --v   | --version           | returns current version                                                                         |
| --h   | --help              | outputs help text                                                                               |
<hr>

## Notes

To use --u and --p (headless login) you must do a --l once first to grant required permissions (playlists, saved songs ect.)

if you receive 'Got a spotify api error WebapiRegularError: An error occurred while communicating with Spotify's Web API
Details: non existing id'  you may need to provide auth either use `--l` for manual login prompt or `--u username --p password` for headless login

If you receive a 429 error please provide a cookies file given the `--cof` flag, to generate a cookies file please refer to [Chrome](https://chrome.google.com/webstore/detail/njabckikapfpffapmjgojcnbfjonfjfg) or [Firefox](https://github.com/rotemdan/ExportCookies)

## Docker
```sh
docker run -it --user=$(id -u):$(id -g) -v $(pwd):/download --rm spotify-dl <options-to-spotify-dl defaults to --help>
docker run -it --user=$(id -u):$(id -g) -v $(pwd):/download --rm spotify-dl "https://open.spotify.com/...."
```

#### Acknowledgements

thanks to [icons8](https://icons8.com) for icons in hero image
and all the contributors for PR, suggestions and testing :love:

&nbsp;

#### License

MIT © [Swapnil Soni](https://github.com/SwapnilSoni1999)
