/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const resetHistory = (...stubObjects) => {
  const resetStub = (stub) => stub.resetHistory();
  const resetStubObject = (stubObject) => Object.values(stubObject).forEach(resetStub);
  stubObjects.forEach(resetStubObject);
};

export default resetHistory;
