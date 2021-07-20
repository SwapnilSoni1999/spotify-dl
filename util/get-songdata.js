'use strict';
const spotify = require('../lib/api');

class SpotifyExtractor {
  constructor(options) {
    this.spotify = spotify(options)
  }

  async checkCredentials() {
    return await this.spotify.checkCredentials();
  }

  async getTrack(url) {
    return await this.spotify.extractTrack(this.getID(url));
  }

  async getAlbum(url) {
    return await this.spotify.extractAlbum(this.getID(url));
  }

  async getArtist(url) {
    return await this.spotify.extractArtist(this.getID(url));
  }

  async getArtistAlbums(url) {
    const artistResult = await this.getArtist(url);
    const albumsResult = await this.spotify.extractArtistAlbums(
      artistResult.id,
    );
    const albumIds = albumsResult.map(album => album.id);
    let albumInfos = [];
    for (let x = 0; x < albumIds.length; x++) {
      albumInfos.push(await this.spotify.extractAlbum(albumIds[x]));
    }
    return albumInfos;
  }

  async getPlaylist(url) {
    return await this.spotify.extractPlaylist(this.getID(url));
  }

  getID(url) {
    const splits = url.split('/');
    return splits[splits.length - 1];
  }

  async getSavedAlbums() {
    const albums = await this.spotify.extractSavedAlbums();
    let albumInfos = [];
    for (let x = 0; x < albums.length; x++) {
      albumInfos.push(await this.spotify.extractAlbum(albums[x].id));
    }
    return albumInfos;
  }

  async getSavedPlaylists() {
    const playlistsResults = await this.spotify.extractSavedPlaylists();
    const playlistIds = playlistsResults.map(playlist => playlist.id);
    let playlistInfos = [];
    for (let x = 0; x < playlistIds.length; x++) {
      playlistInfos.push(await this.spotify.extractPlaylist(playlistIds[x]));
    }
    return playlistInfos;
  }

  async getSavedTracks() {
    return await this.spotify.extractSavedTracks();
  }
}

module.exports = SpotifyExtractor;