/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Web3 = require('web3');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const base64url = require('base64url');

const serializeForHashing = (object) => {
  const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
  const isString = (subject) => typeof subject === 'string';
  const isArray = (subject) => Array.isArray(subject);

  if (isDict(object)) {
    const content = Object.keys(object).sort()
      .map((key) => `"${key}":${serializeForHashing(object[key])}`)
      .join(',');

    return `{${content}}`;
  } else if (isArray(object)) {
    const content = object.map((item) => serializeForHashing(item)).join(',');

    return `[${content}]`;
  } else if (isString(object)) {
    return `"${object}"`;
  }

  return object.toString();
};

async function getToken(secret) {
  try {
    const web3 = new Web3('');

    const idData = {
      createdBy: web3.eth.accounts.privateKeyToAccount(secret).address,
      validUntil: Math.floor(Date.now() / 1000) + 86400
    };

    const sign = web3.eth.accounts.sign(serializeForHashing(idData), secret).signature;

    const token = base64url(serializeForHashing({
      signature: sign,
      idData
    }));

    console.log(token);
  } catch (err) {
    console.log('ERROR:', err);
  }
}

if (process.argv.length > 2) {
  getToken(process.argv[2]);
} else {
  console.log('Usage: node getToken.js <privKey>');
}
