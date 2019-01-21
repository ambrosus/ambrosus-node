/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class ChallengesRepository {
  constructor(challengesWrapper, configWrapper, blockchainStateWrapper, activeChallengesCache) {
    this.challengesWrapper = challengesWrapper;
    this.configWrapper = configWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.activeChallengesCache = activeChallengesCache;
    this.lastSavedBlock = 0;
  }

  extractChallengeFromEvent(challengeEvents, outputFields) {
    return challengeEvents.map(
      ({blockNumber, returnValues}) => outputFields.reduce(
        (acc, fieldName) => {
          acc[fieldName] = returnValues[fieldName];
          return acc;
        },
        {blockNumber}
      )
    );
  }

  sortChallenges(challenges) {
    return challenges.sort((left, right) => left.blockNumber - right.blockNumber);
  }

  async ongoingChallenges() {
    const {fromBlock, currentBlock} = await this.updateBlockInfo();
    await this.updateActiveBlockCache(fromBlock, currentBlock);
    return this.sortChallenges(this.activeChallengesCache.activeChallenges);
  }

  async updateActiveBlockCache(fromBlock, currentBlock) {
    const allChallengeEvents = await this.challengesWrapper.challenges(fromBlock, currentBlock);
    const resolvedChallengeEvents = await this.challengesWrapper.resolvedChallenges(fromBlock, currentBlock);
    const timedOutChallengeEvents = await this.challengesWrapper.timedOutChallenges(fromBlock, currentBlock);

    const startedChallenges = this.extractChallengeFromEvent(allChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = this.extractChallengeFromEvent(resolvedChallengeEvents, ['challengeId', 'resolverId']);
    const timedOutChallenges = this.extractChallengeFromEvent(timedOutChallengeEvents, ['challengeId']);
    
    this.activeChallengesCache.add(startedChallenges);
    this.activeChallengesCache.decreaseActiveCount(resolvedChallenges);
    this.activeChallengesCache.expire(timedOutChallenges);
  }

  async updateBlockInfo() {
    const challengeDuration = await this.configWrapper.challengeDuration();
    const fromBlock = this.lastSavedBlock ? this.lastSavedBlock + 1 : await this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
    const currentBlock = await this.blockchainStateWrapper.getCurrentBlock();
    this.lastSavedBlock = currentBlock;
    return {fromBlock, currentBlock};
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
