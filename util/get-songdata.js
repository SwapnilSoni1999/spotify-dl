'use strict';
const Spotify = require('../lib/api');

var spotify = new Spotify({
  id: 'acc6302297e040aeb6e4ac1fbdfd62c3',
  secret: '68d6b1b5b32d463c889944515e42bb1c'
});

class Spotifye {
  async getTrack(url) {
    const ID = await this.getID(url);
    return ID;
  }
  async getAlbum(url) {
    const ID = await this.getID(url);
    return ID;
  }
  async getArtist(url) {
    const ID = await this.getID(url);
    return ID;
  }
  async getPlaylist(url) {
    const ID = await this.getID(url);
    return ID;
  }

  async getID(url) {
    var id;
    for (let i = 0; i < url.length; i++) {
      if (i > 10 && url[i] == '/') {
        for (let j = i; j < url.length; j++) {
          if (url[j] == '/') {
            id = url.slice(++j);
          }
        }
      }
    }
    return id;
  }


}

module.exports = Spotifye;