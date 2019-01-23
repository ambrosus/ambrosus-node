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
    const {fromBlock, currentBlock} = await this.updateBlockInfo();
    await this.updateActiveChallengesCache(fromBlock, currentBlock);
    const active = this.activeChallengesCache.activeChallenges;
    console.log(active);
    return active;
  }

  async updateActiveChallengesCache(fromBlock, currentBlock) {
    const issuedChallengeEvents = await this.challengesWrapper.challenges(fromBlock, currentBlock);
    const resolvedChallengeEvents = await this.challengesWrapper.resolvedChallenges(fromBlock, currentBlock);
    const timedOutChallengeEvents = await this.challengesWrapper.timedOutChallenges(fromBlock, currentBlock);

    const startedChallenges = this.prepareChallengeEvent(issuedChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = this.prepareChallengeEvent(resolvedChallengeEvents, ['challengeId']);
    const timedOutChallenges = this.prepareChallengeEvent(timedOutChallengeEvents, ['challengeId']);
    this.activeChallengesCache.applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges);
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
