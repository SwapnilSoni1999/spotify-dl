'use strict';
const parser = async inputUrl => {
  if (inputUrl.includes('youtube')) {
    return 'youtube';
  }
  else if (inputUrl.includes('/track/')) {
    return 'song';
  }
  else if (inputUrl.includes('/playlist/')) {
    return 'playlist';
  }
  else if (inputUrl.includes('/album/')) {
    return 'album';
  }
  else if (inputUrl.includes('/artist/')) {
    return 'artist';
  }
  else {
    return new Error('Invalid spotify URL');
  }
};

module.exports = parser;