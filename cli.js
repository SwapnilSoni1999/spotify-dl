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

const { ffmpegSetup, getSpinner, initSpinner, cliInputs } = require('./lib/setup');
const Runner = require('./util/runner');
const versionChecker = require('./util/version-checker');
const { inputs, extraSearch, output, outputOnly } = cliInputs();

// setup ffmpeg
ffmpegSetup(process.platform);
const spinner = initSpinner();

process.on('SIGINT', () => {
  process.exit(1);
});

versionChecker();

try {
  Runner.run({ 
    inputs, 
    extraSearch, 
    output, 
    outputOnly, 
  }).then(() =>
    process.exit(0),
  );
} catch (error) {
  spinner.fail('Something went wrong!');
  console.log(error);
  process.exit(1);
}