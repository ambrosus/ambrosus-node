/*
 * Copyright: Ambrosus Inc.
 * Email: tech@ambrosus.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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