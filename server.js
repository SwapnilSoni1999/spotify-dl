import https from 'https';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import express from 'express';

import { ensureSelfSignedCertificate } from './util/cert-generator.js';
import Constants from './util/constants.js';

const {
  SERVER: { PORT, HOST, CALLBACK_URI, TOKEN_URI },
} = Constants;

const AUTH_CODE_FILE_PATH = path.resolve(process.cwd(), '.spotify-auth-code.json');


const readAuthCodeStore = async () => {
  try {
    const fileContent = await readFile(AUTH_CODE_FILE_PATH, 'utf8');

    return JSON.parse(fileContent);
  } catch (_error) {
    console.log('Auth code file not found or invalid, initializing new store.');

    return { codesByState: {} };
  }
};

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

  if (!code || !state) {
    console.log('Received callback without required code/state:', req.query);
    res.status(400).send('Missing code or state in callback URL.');

    return;
  }

  try {
    const store = await readAuthCodeStore();
    store.codesByState[state] = {
      code,
      receivedAt: new Date().toISOString(),
    };

    await writeFile(
      AUTH_CODE_FILE_PATH,
      JSON.stringify(store, null, 2),
      'utf8'
    );
    console.log('Authorization code received and saved to disk.');
  } catch {
    console.log('Failed to write authorization code to disk.');
  }
  res.send('');
});

app.get(TOKEN_URI, async (req, res) => {
  const state = getQueryString(req.query.state);

  if (!state) {
    return res.status(400).send('Invalid state');
  }

  try {
    const store = await readAuthCodeStore();
    const stateEntry = store.codesByState[state];

    if (!stateEntry || typeof stateEntry.code !== 'string' || stateEntry.code.length === 0) {
      console.warn('State mismatch in token request');

      return res.status(400).send('Invalid state');
    }

    delete store.codesByState[state];

    await writeFile(
      AUTH_CODE_FILE_PATH,
      JSON.stringify(store, null, 2),
      'utf8'
    );

    return res.json({ code: stateEntry.code });
  } catch (error) {
    console.error('Error reading auth code file:', error);

    return res.status(500).send('Internal Server Error');
  }
});

const { cert, key } = ensureSelfSignedCertificate(HOST);
const server = https.createServer({ cert, key }, app);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, resolve);
});