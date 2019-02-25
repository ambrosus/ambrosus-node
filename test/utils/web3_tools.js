/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  checkIfEnoughFundsToPayForGas,
  getBalance,
  isSyncing,
  waitForChainSync
} from '../../src/utils/web3_tools';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Web3 from 'web3';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const {expect} = chai;

describe('Web3 tools', () => {
  let mockWeb3;
  const address = '0xdeadbeef';
  const exampleBalance = '10';
  const {utils} = new Web3();

  beforeEach(async () => {
    mockWeb3 = {
      eth: {
        isSyncing: sinon.stub(),
        getBalance: sinon.stub().resolves(exampleBalance)
      },
      utils
    };
  });

  describe('isSyncing', () => {
    it('returns false when web3.eth.isSyncing returns false', async () => {
      mockWeb3.eth.isSyncing.resolves(false);
      expect(await isSyncing(mockWeb3)).to.be.false;
      expect(mockWeb3.eth.isSyncing).to.be.calledOnce;
    });

    it('returns false when highestBlock equals currentBlock', async () => {
      mockWeb3.eth.isSyncing.resolves({
        currentBlock: 312,
        highestBlock: 312
      });
      expect(await isSyncing(mockWeb3)).to.be.false;
    });

    it('returns true when highestBlock > currentBlock', async () => {
      mockWeb3.eth.isSyncing.resolves({
        currentBlock: 312,
        highestBlock: 512
      });
      expect(await isSyncing(mockWeb3)).to.be.true;
    });
  });

  describe('waitForChainSync', () => {
    const timeout = 3;
    let clock;

    before(() => {
      clock = sinon.useFakeTimers();
    });

    after(() => {
      clock.restore();
    });

    it('checks if chain is not in sync mode every `timeout` seconds', async () => {
      // Seems to be the only way to test setTimeout in async task https://github.com/sinonjs/lolex/issues/194#issuecomment-395224370

      mockWeb3.eth.isSyncing.resolves({
        currentBlock: 312,
        highestBlock: 512
      });
      let callCount = 0;
      await waitForChainSync(mockWeb3, timeout, () => {
        callCount++;
        expect(mockWeb3.eth.isSyncing).to.have.callCount(callCount);
        if (callCount === 10) {
          mockWeb3.eth.isSyncing.resolves(true);
        }
        clock.tick(timeout * 1000);
      });

      expect(mockWeb3.eth.isSyncing).to.have.callCount(11);
    });

    it('does not call callback when chain is in sync', async () => {
      mockWeb3.eth.isSyncing.resolves(true);
      const spy = sinon.spy();
      await waitForChainSync(mockWeb3, timeout, spy);
      expect(spy).to.be.not.called;
    });
  });

  it(`getBalance returns user's balance`, async () => {
    expect(await getBalance(mockWeb3, address)).to.equal(exampleBalance);
  });

  describe('checkIfEnoughFundsToPayForGas', () => {
    it('returns false if balance is less than maxGasPrice', async () => {
      mockWeb3.eth.getBalance.resolves('13500000000000000');
      expect(await checkIfEnoughFundsToPayForGas(mockWeb3, address)).to.be.false;
    });

    it('returns true if balance is greater or equals to maxGasPrice', async () => {
      mockWeb3.eth.getBalance.resolves('23500000000000000');
      expect(await checkIfEnoughFundsToPayForGas(mockWeb3, address)).to.be.true;
      mockWeb3.eth.getBalance.resolves('23500000000000001');
      expect(await checkIfEnoughFundsToPayForGas(mockWeb3, address)).to.be.true;
    });
  });
});
