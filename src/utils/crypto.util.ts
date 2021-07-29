/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import * as crypto from 'crypto';

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'base64'; // can be hex or base64

export const encrypt = (data, keyHex: string) => {
  let keyFormatted: string;

  if (keyHex.indexOf('0x') === 0) {
    keyFormatted = keyHex.substring(2);
  } else {
    keyFormatted = keyHex;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(keyFormatted, 'hex'), iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
};

export const decrypt = (data, keyHex: string) => {
  let keyFormatted: string;

  if (keyHex.indexOf('0x') === 0) {
    keyFormatted = keyHex.substring(2);
  } else {
    keyFormatted = keyHex;
  }

  const textParts = data.split(':');
  const iv = Buffer.from(textParts.shift(), ENCODING);
  const encryptedText = Buffer.from(textParts.join(':'), ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(keyFormatted, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};
