/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {Writable} from 'stream';

export default class StringWriteStream extends Writable {
  constructor(options) {
    super(options);
    this.result = '';
  }

  _write(chunk, encoding, callback) {
    this.result += chunk.toString();
    callback(null);
  }

  get() {
    return this.result;
  }
}
