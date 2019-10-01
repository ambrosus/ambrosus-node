/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {readFile, writeFile, checkFileExists} from '../utils/file';

export default class Store {
  constructor(storeFilePath) {
    this.storeFilePath = storeFilePath;
  }

  async write(key, value) {
    const contents = await this.readFile();
    contents[key] = value;
    await this.writeFile(contents);
  }

  async read(key) {
    const contents = await this.readFile();
    if (contents[key] === undefined) {
      throw new Error(`The value for ${key} is missing in the store at ${this.storeFilePath}`);
    }
    return contents[key];
  }

  async safeRead(key) {
    if (await this.has(key)) {
      return this.read(key);
    }
    return null;
  }

  async has(key) {
    const contents = await this.readFile();
    return contents[key] !== undefined;
  }

  async readFile() {
    if (await checkFileExists(this.storeFilePath)) {
      return JSON.parse(await readFile(this.storeFilePath));
    }
    return {};
  }

  async writeFile(contents) {
    await writeFile(this.storeFilePath, JSON.stringify(contents, null, 2), {mode: 0o660});
  }
}
