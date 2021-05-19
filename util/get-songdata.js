'use strict';
const spotify = require('../lib/api');

class SpotifyExtractor {
  async checkCredentials() {
    return await spotify.checkCredentials();
  }

  async getTrack(url) {
    return await this.extractTrack(this.getID(url));
  }

  async getAlbum(url) {
    return await this.extractAlbum(this.getID(url));
  }

  async getArtist(url) {
    return await this.extractArtist(this.getID(url));
  }

  async getArtistAlbums(url) {
    const artistResult = await this.getArtist(url);
    const albumsResult = await this.extractArtistAlbums(
      artistResult.id,
    );
    const albumIds = albumsResult.map(album => album.id);
    let albumInfos = [];
    for (let x = 0; x < albumIds.length; x++) {
      albumInfos.push(await this.extractAlbum(albumIds[x]));
    }
    return {
      albums: albumInfos,
      artist: artistResult,
    };
  }

  async getPlaylist(url) {
    return await this.extractPlaylist(this.getID(url));
  }

  getID(url) {
    const splits = url.split('/');
    return splits[splits.length - 1];
  }

  async getSavedAlbums() {
    console.log(await this.extractSavedAlbums());
  }

  async getSavedPlaylists() {
    console.log(await this.extractSavedPlaylists());
  }

  async getSavedTracks() {
    console.log(await this.extractSavedTracks());
  }

  async extractTrack(trackId) {
    const trackData = await spotify.extractTrack(trackId);
    trackData.id = trackId;
    return trackData;
  }

  //todo ditch these
  async extractPlaylist(playlistId) {
    return await spotify.extractPlaylist(playlistId);
  }

  async extractAlbum(albumId) {
    return await spotify.extractAlbum(albumId);
  }

  async extractArtist(artistId) {
    return await spotify.extractArtist(artistId);
  }

  async extractArtistAlbums(artistId) {
    return await spotify.extractArtistAlbums(artistId);
  }

  async extractSavedAlbums() {
    return await spotify.extractSavedAlbums();
  }

  async extractSavedPlaylists() {
    return await spotify.extractSavedPlaylists();
  }

  async extractSavedTracks() {
    return await spotify.extractSavedTracks();
  }
}

module.exports = SpotifyExtractor;