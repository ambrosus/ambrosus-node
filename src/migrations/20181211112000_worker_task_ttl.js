/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {safeDropIndex} from './migration_helpers';

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, {workerTasksTTLInSeconds}, logger) => {
  await safeDropIndex(db, 'workerTasks', 'startTime_-1');
  await db.collection('workerTasks').createIndex({startTime: -1}, {expireAfterSeconds: workerTasksTTLInSeconds});

  logger.info(`Added index to worker tasks with TTL=${workerTasksTTLInSeconds}`);
};
