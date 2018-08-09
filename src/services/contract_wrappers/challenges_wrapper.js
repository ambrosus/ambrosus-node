/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';
import {getDefaultAddress} from '../../utils/web3_tools';
import {MIN_BLOCK_TIME} from '../../utils/contracts_consts';

export default class ChallengesWrapper extends ContractWrapper {
  async contract() {
    return this.contractManager.challengesContract();
  }

  async earliestMeaningfulBlock(challengeDuration) {
    return Math.max(0, await this.web3.eth.getBlockNumber() - Math.ceil(challengeDuration / MIN_BLOCK_TIME));
  }

  async previousChallenges(fromBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeCreated', {fromBlock});
  }

  async resolve(challengeId) {
    const contract = await this.contract();
    return contract.methods.resolve(challengeId).send({from: getDefaultAddress(this.contractManager.web3)});
  }

  async canResolve(challengeId) {
    const contract = await this.contract();
    return contract.methods.canResolve(getDefaultAddress(this.web3), challengeId).call();
  }

  async isInProgress(challengeId) {
    const contract = await this.contract();
    return contract.methods.challengeIsInProgress(challengeId).call();
  }
}
