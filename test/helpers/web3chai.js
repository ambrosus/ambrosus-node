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

export {properAddress, properSecret};
