/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MIN_BLOCK_TIME} from '../../utils/contracts_consts';
import ContractWrapper from './contract_wrapper';

export default class ChallengesWrapper extends ContractWrapper {
  get getContractName() {
    return 'challenges';
  }

  async earliestMeaningfulBlock(challengeDuration) {
    return Math.max(0, await this.web3.eth.getBlockNumber() - Math.ceil(challengeDuration / MIN_BLOCK_TIME));
  }

  async challenges(fromBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeCreated', {fromBlock});
  }

  async resolvedChallenges(fromBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeResolved', {fromBlock});
  }

  async timedOutChallenges(fromBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeTimeout', {fromBlock});
  }

  async resolve(challengeId) {
    const contract = await this.contract();
    return contract.methods.resolve(challengeId).send({from: this.defaultAddress});
  }

  async canResolve(challengeId) {
    const contract = await this.contract();
    return contract.methods.canResolve(this.defaultAddress, challengeId).call();
  }

  async isInProgress(challengeId) {
    const contract = await this.contract();
    return contract.methods.challengeIsInProgress(challengeId).call();
  }
}
