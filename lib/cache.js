'use strict';
const fs = require('fs');
const path = require('path');

module.exports = options => ({
  getCacheFile: dir => {
    const { cacheFile } = options;
    const cacheFileIsRelative = cacheFile[0] == '.';
    return cacheFileIsRelative ?
      path.join(dir, cacheFile) : cacheFile;
  },
  writeId: function (dir, id) {
    const cacheFile = this.getCacheFile(dir);
    fs.appendFileSync(cacheFile, `spotify ${id}\n`);
  },
  findId: function (id, dir) {
    const cacheFile = this.getCacheFile(dir);
    fs.mkdirSync(dir, { recursive: true });
    let cached = false;
    if (fs.existsSync(cacheFile)) {
      cached = fs.readFileSync(cacheFile, 'utf-8')
        .split('\n')
        .map(line => line.replace('spotify ', ''))
        .find(line => line == id);
    }
    return cached;
  },
});
