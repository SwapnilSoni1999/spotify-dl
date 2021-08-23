export default inputUrl => {
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
  else if (inputUrl.includes('/show/')) {
    return 'show';
  }
  else if (inputUrl.includes('/episode/')) {
    return 'episode';
  }
  else {
    return new Error('Invalid spotify URL');
  }
};