/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {Assertion} from 'chai';

/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }]*/
const properAddress = (_chai, utils) => {
  utils.addProperty(Assertion.prototype, 'properAddress', function () {
    this.assert(
      this._obj.match(/^0x[0-9-a-fA-F]{40}$/)
      , 'expected #{this} to be a proper ethereum address'
      , 'expected #{this} to not be a proper ethereum address'
    );
  });
};

const properSecret = (_chai, utils) => {
  utils.addProperty(Assertion.prototype, 'properSecret', function () {
    this.assert(
      this._obj.match(/^0x[0-9-a-fA-F]{64}$/)
      , 'expected #{this} to be a proper ethereum address'
      , 'expected #{this} to not be a proper ethereum address'
    );
  });
};

const properTxHash = (_chai, utils) => {
  utils.addProperty(Assertion.prototype, 'properTxHash', function () {
    this.assert(
      this._obj.match(/^0x[0-9-a-fA-F]{64}$/)
      , 'expected #{this} to be a proper tx hash'
      , 'expected #{this} to not be a proper tx hash'
    );
  });
};


export {properAddress, properSecret, properTxHash};
