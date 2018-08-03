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
import AtlasWorker from '../../src/workers/atlas_worker';
import {Role} from '../../src/services/roles_repository';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  let atlasWorker;
  let challengesRepositoryMock;
  let rolesRepositoryMock;
  let dataModelEngineMock;
  let loggerMock;
  let mockWeb3;

  beforeEach(() => {
    mockWeb3 = {
      eth: {
        defaultAccount
      }
    };
    challengesRepositoryMock = {
      resolvableChallenges: sinon.stub(),
      resolveChallenge: sinon.stub()
    };
    rolesRepositoryMock = {
      onboardedRole: sinon.stub()
    };
    dataModelEngineMock = {
      downloadBundle: sinon.stub()
    };
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    atlasWorker = new AtlasWorker(mockWeb3, dataModelEngineMock, rolesRepositoryMock, challengesRepositoryMock, loggerMock);
  });

  describe('Before work loop', () => {
    it('fulfills if role is atlas', async () => {
      rolesRepositoryMock.onboardedRole.resolves(Role.ATLAS);
      await expect(atlasWorker.beforeWorkLoop()).to.be.eventually.fulfilled;
    });

    it('throws if account is not an atlas', async () => {
      rolesRepositoryMock.onboardedRole.resolves(Role.HERMES);
      await expect(atlasWorker.beforeWorkLoop()).to.be.eventually.rejectedWith(Error);
      expect(rolesRepositoryMock.onboardedRole).to.be.calledWith(defaultAccount);
      expect(loggerMock.error).to.be.calledWith('Cannot start atlas worker until being onboarded as ATLAS');
    });
  });

  describe('challenge resolution strategy', () => {
    const sheltererId = 'shelterer';
    const bundleId = 'bundle';
    const challengeId = 'challenge';

    const previousChallenges =  Array(4).fill({sheltererId, bundleId, challengeId});

    beforeEach(() => {
      challengesRepositoryMock.resolvableChallenges.resolves(previousChallenges);
    });

    it('tryToResolve downloads the bundle and resolves a challenge', async () => {
      await atlasWorker.tryToResolve({sheltererId, bundleId, challengeId});
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId);
      expect(challengesRepositoryMock.resolveChallenge).to.be.calledWith(challengeId);
    });

    it('calls tryToResolve for each challenge', async () => {
      await atlasWorker.periodicWork();
      expect(dataModelEngineMock.downloadBundle).to.callCount(4);
    });

    it('periodicWork does not throw when tryToResolve fails', async () => {
      dataModelEngineMock.downloadBundle.rejects();
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
    });
  });
});
