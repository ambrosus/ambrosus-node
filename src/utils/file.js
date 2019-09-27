/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import fs from 'fs';
import path from 'path';

const writeFile = (filepath, data, opts = {}) =>
  new Promise((resolve, reject) => {
    fs.mkdir(path.dirname(filepath), {recursive: true}, (err) => {
      if (err) {
        throw new Error(`can't create dir for ${filepath}: ${err}`);
      }
    });

    fs.writeFile(filepath, data, opts, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const readFile = (filepath) =>
  new Promise((resolve, reject) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const removeFile = (filepath) =>
  new Promise((resolve, reject) => {
    fs.unlink(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

const checkFileExists = (filepath) =>
  new Promise((resolve) => {
    fs.access(filepath, (err) => {
      resolve(!err);
    });
  });

const listDirectory = (filepath) =>
  new Promise((resolve, reject) => {
    fs.readdir(filepath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

const removeDirectory = (filepath) =>
  new Promise((resolve, reject) => {
    fs.rmdir(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

const makeDirectory = (filepath) =>
  new Promise((resolve, reject) => {
    fs.mkdir(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

const getfilepath = (filepath) =>
  new Promise((resolve, reject) => {
    fs.lstat(filepath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });

export {writeFile, readFile, removeFile, checkFileExists, listDirectory, removeDirectory, makeDirectory, getfilepath};
