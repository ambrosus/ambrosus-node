/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class ChallengesRepository {
  constructor(challengesWrapper, challengesEventEmitter, configWrapper, blockchainStateWrapper, activeChallengesCache) {
    this.challengesWrapper = challengesWrapper;
    this.challengesEventEmitter = challengesEventEmitter;
    this.configWrapper = configWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.activeChallengesCache = activeChallengesCache;
    this.lastSavedBlock = 0;
  }

  prepareChallengeEvent(challengeEvents, outputFields) {
    return challengeEvents.map(
      ({blockNumber, logIndex, returnValues}) => outputFields.reduce(
        (acc, fieldName) => {
          acc[fieldName] = returnValues[fieldName];
          return acc;
        },
        {blockNumber, logIndex}
      )
    );
  }

  async ongoingChallenges() {
    const {fromBlock, currentBlock} = await this.getBlockInfo();
    await this.updateActiveChallengesCache(fromBlock, currentBlock);
    this.updateBlockInfo(currentBlock);
    return this.activeChallengesCache.activeChallenges;
  }

  async updateActiveChallengesCache(fromBlock, currentBlock) {
    const issuedChallengeEvents = await this.challengesEventEmitter.challenges(fromBlock, currentBlock);
    const resolvedChallengeEvents = await this.challengesEventEmitter.resolvedChallenges(fromBlock, currentBlock);
    const timedOutChallengeEvents = await this.challengesEventEmitter.timedOutChallenges(fromBlock, currentBlock);

    const startedChallenges = this.prepareChallengeEvent(issuedChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = this.prepareChallengeEvent(resolvedChallengeEvents, ['challengeId']);
    const timedOutChallenges = this.prepareChallengeEvent(timedOutChallengeEvents, ['challengeId']);
    this.activeChallengesCache.applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges);
  }

  async getBlockInfo() {
    const fromBlock = await this.getFromBlock();
    const currentBlock = await this.blockchainStateWrapper.getCurrentBlockNumber();
    return {fromBlock, currentBlock};
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    const challengeDuration = await this.configWrapper.challengeDuration();
    return this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
  }

  async updateBlockInfo(currentBlock) {
    this.lastSavedBlock = currentBlock;
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
