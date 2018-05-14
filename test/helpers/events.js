/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint no-underscore-dangle: ["error", { "allow": ["_obj"] }] */
module.exports = function () {
  const emitEventMethod = function (eventName) {    
    const tx = this._obj;
    const eventOccurences = tx.events[eventName];
    this.assert(
      eventOccurences,
      `expected the tx to emit event: "${eventName}", but it was not emitted`,
      `expected the tx not to emit event: "${eventName}", but it was emitted one or more times`
    );
  };

  return function (chai) {
    chai.Assertion.addMethod('emitEvent', emitEventMethod);
  };
};
