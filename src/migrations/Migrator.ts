/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import path from 'path';
import fs from 'fs';
import {sleep} from '../utils/time_utils';

class Migrator {
  private readonly db: any;
  private readonly config: any;
  private readonly sleepFunction: any;
  private readonly directory: string;

  public constructor(db, config, sleepFunction = sleep, directory = path.dirname(__filename)) {
    this.db = db;
    this.config = config;
    this.sleepFunction = sleepFunction;
    this.directory = directory;
  }

  private getVersionFromPath(name) {
    const filename = path.basename(name);
    const splitParts = filename.split('_');
    return parseInt(splitParts[0], 10);
  }

  private isMigrationPath(file) {
    return path.basename(file).match(/^\d{14}_.*\.js$/);
  }

  private async getCurrentVersion() {
    const result = await this.db.collection('migrations').findOne({});
    return result ? result.version : 0;
  }

  private async isMigrationNecessary() {
    const latestMigrationVersion = this.getVersionFromPath((await this.migrationFiles()).pop());
    return await this.getCurrentVersion() < latestMigrationVersion;
  }

  public async up(fullPath, logger) {
    const version = this.getVersionFromPath(fullPath);
    const getCurrentVersion = await this.getCurrentVersion();
    if (version > getCurrentVersion) {
      logger.info({message: `Migrating: ${path.basename(fullPath)}`});
      const imported = await import(fullPath);
      await imported.up(this.db, this.config, logger);
      await this.db.collection('migrations').findOneAndReplace({}, {version});
    } else {
      logger.info({message: `Ignoring migration: ${path.basename(fullPath)}`});
    }
  }

  private async waitForOtherMigrationsAndMarkAsStarted(logger) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const {modifiedCount} = await this.db.collection('migrations')
        .updateOne({$or: [{migrationRunning: false}, {migrationRunning: {$exists: false}}]},
          {$set: {migrationRunning: true}});

      if (modifiedCount > 0) {
        return;
      }

      logger.info({
        message: 'Another migration is running. Waiting for it to end.'
      });
      await this.sleepFunction(this.config.migrationSleepTimeInSeconds);
    }
  }

  private async initMigrationsCollection() {
    await this.db.collection('migrations').findOneAndUpdate({}, {
      $setOnInsert: {
        version: 0,
        migrationRunning: false
      }
    }, {upsert: true});
  }

  private async initMigrations(logger) {
    await this.initMigrationsCollection();
    await this.waitForOtherMigrationsAndMarkAsStarted(logger);
  }

  private async markMigrationAsDone() {
    await this.db.collection('migrations').updateOne({}, {$set: {migrationRunning: false}});
  }

  private async migrate(logger) {
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
      await this.markMigrationAsDone();
    }
  }

  private async migrationFiles() {
    return fs.readdirSync(this.directory)
      .filter(this.isMigrationPath)
      .sort();
  }

  public async ensureMigrationIsComplete(logger) {
    let retries = 10;

    const delay = ms => new Promise(res => setTimeout(res, ms));

    while (retries-- > 0 && (await this.isMigrationNecessary())) {
      logger.info({message: 'Migration did not complete yet. Retrying in 5 seconds'});

      await delay(5000);
    }

    if (await this.isMigrationNecessary()) {
      throw new Error('Migration did not complete, timeout expired.');
    }
 }
}

export default Migrator;
