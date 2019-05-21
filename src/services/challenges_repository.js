/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const CHALLENGE_EVENT_ONE_FETCH_LIMIT = 5000;

export default class ChallengesRepository {
  constructor(challengesWrapper, challengesEventEmitterWrapper, configWrapper, blockchainStateWrapper, activeChallengesCache) {
    this.challengesWrapper = challengesWrapper;
    this.challengesEventEmitterWrapper = challengesEventEmitterWrapper;
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
    if (fromBlock <= currentBlock) {
      await this.updateActiveChallengesCache(fromBlock, currentBlock);
      this.updateBlockInfo(currentBlock);
    }
    return this.activeChallengesCache.activeChallenges;
  }

  async updateActiveChallengesCache(fromBlock, currentBlock) {
    const startedChallenges = await this.collectChallengeEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.challenges(start, end),
      ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = await this.collectChallengeEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.resolvedChallenges(start, end),
      ['challengeId']);
    const timedOutChallenges = await this.collectChallengeEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.timedOutChallenges(start, end),
      ['challengeId']);
    this.activeChallengesCache.applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges);
  }

  async collectChallengeEvents(fromBlock, currentBlock, fetchEvents, outputFields) {
    return await this.collectChallengeEventsWithStep(fromBlock, currentBlock, CHALLENGE_EVENT_ONE_FETCH_LIMIT, fetchEvents, outputFields);
  }

  async collectChallengeEventsWithStep(fromBlock, currentBlock, step, fetchEvents, outputFields) {
    let collectedChallengeEvents = [];
    for (let startBlock = fromBlock; startBlock < currentBlock; startBlock += step) {
      const endBlock = Math.min(currentBlock, startBlock + step - 1);
      const challengeBlockchainEvents = await fetchEvents(startBlock, endBlock);
      collectedChallengeEvents = collectedChallengeEvents.concat(this.prepareChallengeEvent(challengeBlockchainEvents, outputFields));
    }
    return collectedChallengeEvents;
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

  async getChallengeExpirationTimeInMs(challengeId) {
    const challengeCreationTime = await this.challengesWrapper.getChallengeCreationTime(challengeId);
    const challengeDuration = await this.configWrapper.challengeDuration();
    return (Number(challengeCreationTime) + Number(challengeDuration)) * 1000;
  }

  updateBlockInfo(currentBlock) {
    this.lastSavedBlock = currentBlock;
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challengeId);
  }

  async getChallengeDesignatedShelterer(challengeId) {
    return await this.challengesWrapper.getChallengeDesignatedShelterer(challengeId);
  }
}
