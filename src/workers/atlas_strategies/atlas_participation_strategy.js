/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/** @abstract */
export default class AtlasParticipationStrategy {
  get retryTimeout() {
    return 86400; // 1 day
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldFetchBundle(entity) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldResolve(bundleMetadata) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  async afterResolution(entity) { }
}
