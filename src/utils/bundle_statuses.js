/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const BundleStatuses = Object.freeze({
  unknown: 'UNKNOWN',
  shelteringCandidate: 'SHELTERING_CANDIDATE',
  downloaded: 'DOWNLOADED',
  sheltered: 'SHELTERED',
  cleanup: 'CLEANUP',
  expendable: 'EXPENDABLE'
});

export default BundleStatuses;
