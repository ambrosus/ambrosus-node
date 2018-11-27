/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, {workerLogsTTLInSeconds}, logger) => {
  await db.collection('workerLogs').drop();
  await db.collection('workerLogs').createIndex({timestamp: -1}, {expireAfterSeconds: workerLogsTTLInSeconds});
  logger.info(`Added index to worker logs with TTL=${workerLogsTTLInSeconds}`);
};
