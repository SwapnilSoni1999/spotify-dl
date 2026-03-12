import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CERT_FILE_NAME = '.spotifydl-cert.pem';
const KEY_FILE_NAME = '.spotifydl-key.pem';

export const ensureSelfSignedCertificate = host => {
    const certPath = path.join(process.cwd(), CERT_FILE_NAME);
    const keyPath = path.join(process.cwd(), KEY_FILE_NAME);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        try {
            execFileSync(
                'openssl',
                [
                    'req',
                    '-x509',
                    '-newkey',
                    'rsa:2048',
                    '-nodes',
                    '-keyout',
                    keyPath,
                    '-out',
                    certPath,
                    '-days',
                    '365',
                    '-subj',
                    `/CN=${host}`,
                ],
                { stdio: 'ignore' }
            );
        } catch {
            throw new Error(
                'Unable to generate self-signed certificate. Please install openssl and retry.'
            );
        }
    }

    return {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    };
};
