/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasParticipationStrategy from './atlas_participation_strategy';

/**
 * Atlas resolve strategy that allows everything
 * @extends AtlasParticipationStrategy
 */
export default class ResolveAllStrategy extends AtlasParticipationStrategy {
  /**
   * Overwritten method of AtlasParticipationStrategy
   * @param {Object} entity
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldFetchBundle(entity) {
    return true;
  }

  /**
   * Overwritten method of AtlasParticipationStrategy
   * @param {Object} bundleMetadata
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldResolve(bundleMetadata) {
    return true;
  }
}
