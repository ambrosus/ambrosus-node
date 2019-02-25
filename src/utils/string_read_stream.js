/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {Readable} from 'stream';

class StringReadStream extends Readable {
  constructor(str, chunkSize = 1024) {
    super();
    this.str = str;
    this.chunkSize = chunkSize;
    this.position = 0;
  }

  _read() {
    const uncheckedEndPosition = this.position + this.chunkSize;
    const endPosition = Math.min(uncheckedEndPosition, this.str.length);
    if (this.position !== endPosition) {
      const chunk = this.str.substring(this.position, endPosition);
      this.position = endPosition;
      this.push(chunk, 'utf8');
    } else {
      this.push(null, 'utf8');
    }
  }
}

export default StringReadStream;
