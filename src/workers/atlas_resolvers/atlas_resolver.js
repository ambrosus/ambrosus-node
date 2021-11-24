/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * Represents immutable enum of Atlas resolution statuses
 */
export const atlasResolutionStatus = Object.freeze({
  resolved: 'resolved',
  failed: 'failed',
  shouldNotFetch: 'should_not_fetch',
  shouldNotResolve: 'should_not_resolve'
});

/**
 * Generic Atlas Resolver
 * @abstract
 */
export class AtlasResolver {
  /**
   * @abstract
   * Should contain metrics logic
   * @param registry
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addMetrics(registry) {
    throw new Error('Should be implemented');
  }

  /**
   * @abstract
   * Should contain resolution logic
   * @param entity
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolve(entity) {
    throw new Error('Should be implemented');
  }

  /**
   * @abstract
   * Should contain logic to resolve one object
   * @returns {Promise<void>}
   */
  async resolveOne() {
    throw new Error('Should be implemented');
  }

  /**
   * @abstract
   * Should contain logic to resolve all objects
   * @returns {Promise<void>}
   */
  async resolveAll() {
    throw new Error('Should be implemented');
  }
}
