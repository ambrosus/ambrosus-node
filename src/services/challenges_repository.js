/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ResolutionsRepository from './resolutions_repository';

const CHALLENGE_EVENT_ONE_FETCH_LIMIT = 5000;

export default class ChallengesRepository extends ResolutionsRepository {
  constructor(challengesWrapper, challengesEventEmitterWrapper, configWrapper, blockchainStateWrapper, activeChallengesCache) {
    super(blockchainStateWrapper, activeChallengesCache, CHALLENGE_EVENT_ONE_FETCH_LIMIT);
    this.challengesWrapper = challengesWrapper;
    this.challengesEventEmitterWrapper = challengesEventEmitterWrapper;
    this.configWrapper = configWrapper;
  }

  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    const startedChallenges = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.challenges(start, end),
      ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.resolvedChallenges(start, end),
      ['challengeId']);
    const timedOutChallenges = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.challengesEventEmitterWrapper.timedOutChallenges(start, end),
      ['challengeId']);
    this.activeResolutionsCache.applyIncomingResolutionEvents(startedChallenges, resolvedChallenges, timedOutChallenges);
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    const challengeDuration = await this.configWrapper.challengeDuration();
    return this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
  }

  async getExpirationTimeInMs(challenge) {
    const challengeCreationTime = await this.challengesWrapper.getChallengeCreationTime(challenge.challengeId);
    const challengeDuration = await this.configWrapper.challengeDuration();
    return (Number(challengeCreationTime) + Number(challengeDuration)) * 1000;
  }

  async resolve(challenge) {
    if (!await this.challengesWrapper.canResolve(challenge.challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challenge.challengeId);
  }

  async getDesignatedShelterer(challenge) {
    return await this.challengesWrapper.getChallengeDesignatedShelterer(challenge.challengeId);
  }
}
