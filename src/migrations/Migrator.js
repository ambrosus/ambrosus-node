/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import path from 'path';
import fs from 'fs';
import {getTimestamp} from '../utils/time_utils';

class Migrator {
  constructor(db, config, directory = path.dirname(__filename)) {
    this.db = db;
    this.config = config;
    this.directory = directory;
  }

  getVersionFromPath(name) {
    const filename = path.basename(name);
    const splitted = filename.split('_');
    return parseInt(splitted[0], 10);
  }

  isMigrationPath(file) {
    return path.basename(file).match(/^\d{14}_.*\.js$/);
  }

  async getCurrentVersion() {
    const result = await this.db.collection('migrations').findOne({});
    return result ? result.version : 0;
  }

  async isMigrationNeccesary() {
    const latestMigrationVersion = this.getVersionFromPath((await this.migrationFiles()).pop());
    return await this.getCurrentVersion() < latestMigrationVersion;
  }

  async up(fullPath, logger) {
    const version = this.getVersionFromPath(fullPath);
    const getCurrentVersion = await this.getCurrentVersion();
    if (version > getCurrentVersion) {
      logger.info(`Migrating: ${path.basename(fullPath)}`);
      const imported = require(fullPath);
      await imported.up(this.db, this.config, logger);
      await this.db.collection('migrations').findOneAndReplace({}, {version});
    } else {
      logger.info(`Ignoring migration: ${path.basename(fullPath)}`);
    }
  }

  async waitForOpenWindowAndStartMigration(logger) {
    const sleep = async (timeout) => new Promise((resolve) => {
      setTimeout(resolve, timeout * 1000);
    });
    let migrationStartTime;

    do {
      const {modifiedCount} = await this.db.collection('migrations').updateOne({migrationStartTime: {$exists: false}}, {$set: {migrationStartTime: getTimestamp()}});
      if (modifiedCount > 0) {
        return;
      }
      logger.info('Another migration is running. Waiting for it to end');
      await sleep(this.config.migrationSleepTime);
      ({migrationStartTime} = (await this.db.collection('migrations').findOne({})));
    } while (migrationStartTime + this.config.migrationTaskTimeout > getTimestamp());
  }

  async initMigrations(logger) {
    await this.db.collection('migrations').findOneAndUpdate({}, {$setOnInsert: {version: 0}}, {upsert: true});
    await this.waitForOpenWindowAndStartMigration(logger);
  }

  async migrate(logger) {
    await this.initMigrations(logger);
    try {
      const migrationFiles = await this.migrationFiles();
      for (const file of migrationFiles) {
        if (this.isMigrationPath(file)) {
          const fullPath = path.join(this.directory, file);
          await this.up(fullPath, logger);
        }
      }
    } finally {
      await this.db.collection('migrations').updateOne({}, {$unset: {migrationStartTime: ''}});
    }
  }

  async migrationFiles() {
    return fs.readdirSync(this.directory)
      .filter(this.isMigrationPath)
      .sort();
  }
}

export default Migrator;
