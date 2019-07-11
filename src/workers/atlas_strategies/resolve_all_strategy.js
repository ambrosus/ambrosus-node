/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasParticipationStrategy from './atlas_participation_strategy';

export default class ResolveAllStrategy extends AtlasParticipationStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldFetchBundle(entity) {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldResolve(bundleMetadata) {
    return true;
  }
}
