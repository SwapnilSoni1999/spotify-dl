import fs from 'fs';
import path from 'path';

import { cliInputs } from './setup.js';

const getCacheFile = dir => {
  const { cacheFile } = cliInputs();
  const cacheFileIsRelative = cacheFile[0] == '.';

  return cacheFileIsRelative ? path.join(dir, cacheFile) : cacheFile;
};

export const writeId = function (dir, id) {
  const cacheFile = getCacheFile(dir);
  fs.appendFileSync(cacheFile, `spotify ${id}\n`);
};

export const findId = function (id, dir) {
  const cacheFile = getCacheFile(dir);
  let cached = false;
  if (fs.existsSync(cacheFile)) {
    cached = fs
      .readFileSync(cacheFile, 'utf-8')
      .split('\n')
      .map(line => line.replace('spotify ', ''))
      .find(line => line == id);
  }

  return cached;
};
