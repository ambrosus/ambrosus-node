/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {readFile, writeFile, checkFileExists} from '../utils/file';

/**
 * Simple key-value store implementation
 */
export default class Store {
  /**
   * @param {String} storeFilePath - the path to the file used to store data
   */
  constructor(storeFilePath) {
    this.storeFilePath = storeFilePath;
  }

  /**
   * Writes key-value pair to the file. Overwrites content if key already exist
   * @param {string} key - the key
   * @param {string} value - the value
   * @returns {Promise<void>}
   */
  async write(key, value) {
    const contents = await this.readFile();
    contents[key] = value;
    await this.writeFile(contents);
  }

  /**
   * Reads value from file
   * @throws Error is file doesn't contain such key
   * @param {string} key - the key
   * @returns {Promise<*>}
   */
  async read(key) {
    const contents = await this.readFile();
    if (contents[key] === undefined) {
      throw new Error(`The value for ${key} is missing in the store at ${this.storeFilePath}`);
    }
    return contents[key];
  }

  /**
   * Reads value from file. Before read checks if key exist.
   * @param {string} key - the key
   * @returns {Promise<null|*>}
   */
  async safeRead(key) {
    if (await this.has(key)) {
      return this.read(key);
    }
    return null;
  }

  /**
   * Checks if provided key exist
   * @param {string} key - the key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    const contents = await this.readFile();
    return contents[key] !== undefined;
  }

  /**
   * Safely reads file from disk and converts data to Object
   * @returns {Promise<Object|any>}
   */
  async readFile() {
    if (await checkFileExists(this.storeFilePath)) {
      return JSON.parse(await readFile(this.storeFilePath));
    }
    return {};
  }

  /**
   * Writes object to the disk
   * @param {Object} contents
   * @returns {Promise<void>}
   */
  async writeFile(contents) {
    await writeFile(this.storeFilePath, JSON.stringify(contents, null, 2), {mode: 0o660});
  }
}
