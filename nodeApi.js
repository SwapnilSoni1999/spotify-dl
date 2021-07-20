#!/usr/bin/env node

/*
  Copyright (c) 2021 Swapnil Soni

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
*/

const { ffmpegSetup, getSpinner, initSpinner } = require('./lib/setup');
const Runner = require('./util/runner');
const fs = require('fs');

const { flags: defaultOptions } = require('./config');

// setup ffmpeg
ffmpegSetup(process.platform);

module.exports = async (inputs, options) => {
  let stream = fs.createWriteStream('output.log');
  const spinner = initSpinner({ stream });

  await Runner.run(inputs, {
    ...defaultOptions, //use default for any missing options
    ...options
  })

  stream.end()
}
