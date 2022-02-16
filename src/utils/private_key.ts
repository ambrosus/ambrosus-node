/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import http from 'http';
import crypto from 'crypto';

export function networkRequest(method: string, url: string): Promise<{resBody: string, status: number}> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {method, headers: {'Content-Type': 'application/json'}}, (res) => {
      let outputData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        outputData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({resBody: outputData, status: res.statusCode});
        }
        reject(res.statusCode);
      });
    });
    req.on('error', (err) => {
      console.error('error occurred', err);
      reject(err);
    });
    req.end();
  });
}

export function aesDecrypt(input: Buffer, key: Buffer): string {
  const iv = input.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  const decrypted = Buffer.concat([decipher.update(input.slice(16)), decipher.final()]);
  return `${decrypted.toString()}`;
}
