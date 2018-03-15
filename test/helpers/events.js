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
