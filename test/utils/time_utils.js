/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {sleep} from '../../src/utils/time_utils';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Time utils', () => {
  let clock;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  after(() => {
    clock.restore();
  });

  describe('sleep', () => {
    const exampleSleepTime = 3;
    it('should sleep specified time in seconds', async () => {
      const sleepCallback = sinon.spy();
      const sleepPromise = sleep(exampleSleepTime).then(sleepCallback);
      clock.tick((exampleSleepTime * 1000) - 1);
      expect(sleepCallback).to.be.not.called;
      clock.tick(1);
      await expect(sleepPromise).to.be.fulfilled;
      expect(sleepCallback).to.be.calledOnce;
    });
  });
});
