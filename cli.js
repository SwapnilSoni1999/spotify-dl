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

const { startup } = require('./lib/setup');
const { logFailure } = require('./util/log-helper');
const Runner = require('./util/runner');

startup();
try {
  Runner.run().then(() => process.exit(0));
} catch (error) {
  logFailure('Something went wrong!');
  console.log(error);
  process.exit(1);
}