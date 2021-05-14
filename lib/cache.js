'use strict';
const fs = require('fs');
const path = require('path');
const { cliInputs } = require('./setup');

module.exports = {
  getCacheFile: dir => {
    const { cacheFile } = cliInputs();
    const cacheFileIsRelative = cacheFile[0] == '.';
    return cacheFileIsRelative ?
      path.join(dir, cacheFile) : cacheFile;
  },
  write: async function (dir, id) {
    const cacheFile = this.getCacheFile(dir);
    fs.appendFileSync(cacheFile, `spotify ${id}\n`);
  },
  read: async function (dir, spinner) {
    const cacheFile = this.getCacheFile(dir);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(cacheFile)) {
      spinner.info('Fetching cache to resume Download\n');
      return fs.readFileSync(cacheFile, 'utf-8');
    }
  },
};
