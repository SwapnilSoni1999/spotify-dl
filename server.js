import https from 'https';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs';

import express from 'express';

import { ensureSelfSignedCertificate } from './util/cert-generator.js';
import Constants from './util/constants.js';

const {
  SERVER: { PORT, HOST, CALLBACK_URI, TOKEN_URI },
} = Constants;

const AUTH_CODE_FILE_PATH = path.resolve(process.cwd(), '.spotify-auth-code.json');

const getQueryString = value => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
};

const app = express();
app.get(CALLBACK_URI, async (req, res) => {
  const code = getQueryString(req.query.code);
  const state = getQueryString(req.query.state);

  if (!code) {
    console.log('Received callback without code:', req.query);

    return;
  }

  try {
    await writeFile(
      AUTH_CODE_FILE_PATH,
      JSON.stringify(
        {
          code,
          state,
          receivedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );
    console.log('Authorization code received and saved to disk.');
  } catch {
    console.log('Failed to write authorization code to disk.');
  }
  res.send('');
});

app.get(TOKEN_URI, async (req, res) => {
  // endpoint takes in a state param and returns the code
  await readFile(AUTH_CODE_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading auth code file:', err);

      return res.status(500).send('Internal Server Error');
    }

    try {
      const { code, state } = JSON.parse(data);
      if (state !== req.query.state) {
        console.warn('State mismatch in token request');

        return res.status(400).send('Invalid state');
      }
      res.json({ code });
    } catch (parseErr) {
      console.error('Error parsing auth code file:', parseErr);

      return res.status(500).send('Internal Server Error');
    }
  });
});

const { cert, key } = ensureSelfSignedCertificate(HOST);
const server = https.createServer({ cert, key }, app);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, resolve);
});