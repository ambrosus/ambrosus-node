/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export const atlasResolutionStatus = Object.freeze({
  resolved: 'resolved',
  failed: 'failed',
  shouldNotFetch: 'should_not_fetch',
  shouldNotResolve: 'should_not_resolve'
});

/** @abstract */
export class AtlasResolver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addMetrics(registry) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolve(entity) {
    throw new Error('Should be implemented');
  }

  async resolveOne() {
    throw new Error('Should be implemented');
  }

  async resolveAll() {
    throw new Error('Should be implemented');
  }
}
