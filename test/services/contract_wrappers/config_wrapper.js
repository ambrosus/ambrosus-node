/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ConfigWrapper from '../../../src/services/contract_wrappers/config_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Config Wrapper', () => {
  let getContractStub;
  let configWrapper;

  describe('ATLAS1_STAKE', () => {
    let atlasStake1Stub;
    let atlasStake1CallStub;
    const stake = '100';

    beforeEach(async () => {
      atlasStake1Stub = sinon.stub();
      atlasStake1CallStub = sinon.stub();
      const contractMock = {
        methods: {
          ATLAS1_STAKE: atlasStake1Stub.returns({
            call: atlasStake1CallStub.resolves(stake)
          })
        }
      };
      configWrapper = new ConfigWrapper();
      getContractStub = sinon.stub(configWrapper, 'contract').resolves(contractMock);
    });

    afterEach(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      expect(await configWrapper.atlas1Stake()).to.equal(stake);
      expect(atlasStake1Stub).to.be.calledOnce;
      expect(atlasStake1CallStub).to.be.calledOnce;
    });
  });

  describe('CHALLENGE_DURATION', () => {
    let challengeDurationStub;
    let challengeDurationCallStub;
    const challengeDuration = '100';

    beforeEach(async () => {
      challengeDurationStub = sinon.stub();
      challengeDurationCallStub = sinon.stub();
      const contractMock = {
        methods: {
          CHALLENGE_DURATION: challengeDurationStub.returns({
            call: challengeDurationCallStub.resolves(challengeDuration)
          })
        }
      };
      configWrapper = new ConfigWrapper();
      getContractStub = sinon.stub(configWrapper, 'contract').resolves(contractMock);
    });

    afterEach(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      expect(await configWrapper.challengeDuration()).to.equal(challengeDuration);
      expect(challengeDurationStub).to.be.calledOnce;
      expect(challengeDurationCallStub).to.be.calledOnce;
    });
  });

  describe('BUNDLE_SIZE_LIMIT', () => {
    let bundleSizeLimitStub;
    let bundleSizeLimitCallStub;
    const bundleSizeLimit = '100';

    beforeEach(async () => {
      bundleSizeLimitStub = sinon.stub();
      bundleSizeLimitCallStub = sinon.stub();
      const contractMock = {
        methods: {
          BUNDLE_SIZE_LIMIT: bundleSizeLimitStub.returns({
            call: bundleSizeLimitCallStub.resolves(bundleSizeLimit)
          })
        }
      };
      configWrapper = new ConfigWrapper();
      getContractStub = sinon.stub(configWrapper, 'contract').resolves(contractMock);
    });

    afterEach(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      expect(await configWrapper.bundleSizeLimit()).to.equal(bundleSizeLimit);
      expect(bundleSizeLimitStub).to.be.calledOnce;
      expect(bundleSizeLimitCallStub).to.be.calledOnce;
    });
  });
});
