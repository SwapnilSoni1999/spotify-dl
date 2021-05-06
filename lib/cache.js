'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
  write: async (dir, id) => {
    fs.appendFileSync(dir, `${id}\n`);
  },
  read: async (dir, spinner) => {
    const cacheFile = path.join(dir, '.spdlcache');
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(cacheFile)) {
      spinner.info('Fetching cache to resume Download\n');
      return fs.readFileSync(cacheFile, 'utf-8');
    }
  },
};
