/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import Builder from '../../../src/builder';
import config from '../../../config/config';
import AtlasWorker from '../../../src/workers/atlas_worker';
import {createFullAsset, createFullBundle} from '../../fixtures/assets_events';
import {cleanDatabase} from '../../../src/utils/db_utils';
import deployAll from '../../../src/utils/deployment';
import {createWeb3} from '../../../src/utils/web3_tools';
import {addToKycWhitelist} from '../../../src/utils/prerun';
import {Role} from '../../../src/services/roles_repository';
import Web3 from 'web3';
import nock from 'nock';
import AtlasChallengeParticipationStrategy
  from '../../../src/workers/atlas_strategies/atlas_challenge_resolution_strategy';
import {pick} from '../../../src/utils/dict_utils';
import BundleStatusStates from '../../../src/utils/bundle_status_states';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const {expect} = chai;

describe('Atlas worker - integration', () => {
  let atlasWorker;
  let web3;
  let builder;
  let exampleBundle;
  let hermesUploadActions;
  let headContractAddress;
  const hermesUrl = 'http://hermes.com';
  const atlasUrl = 'http://atlas.com';
  const storagePeriods = 8;
  const loggerMock = {
    info: () => {},
    error: () => {}
  };

  let mockStrategy;

  const createMockStrategy = () => {
    mockStrategy = {
      workerInterval: 5,
      retryTimeout: 5,
      shouldFetchBundle: sinon.stub().resolves(true),
      shouldResolveChallenge: sinon.stub().resolves(true),
      afterChallengeResolution: sinon.stub()
    };
    mockStrategy.__proto__ = AtlasChallengeParticipationStrategy.prototype;
  };

  const prepareHermesSetup = async (web3, hermesAddress) => {
    const hermesWeb3 = new Web3(web3.currentProvider);
    hermesWeb3.eth.defaultAccount = hermesAddress;
    const hermesBuilder = new Builder();
    await hermesBuilder.build({...config, headContractAddress}, {web3: hermesWeb3});
    await addToKycWhitelist(Role.HERMES, '0', hermesBuilder.dataModelEngine, builder.kycWhitelistWrapper, loggerMock);
    await hermesBuilder.rolesRepository.onboardAsHermes(hermesBuilder.identityManager.nodeAddress(), hermesUrl);
    return hermesBuilder;
  };

  const onboardAtlas = async () => {
    await addToKycWhitelist(Role.ATLAS, web3.utils.toWei('10000', 'ether'), builder.dataModelEngine,
      builder.kycWhitelistWrapper, loggerMock);
    await builder.rolesRepository.onboardAsAtlas(builder.identityManager.nodeAddress(), atlasUrl);
  };

  before(async () => {
    web3 = await createWeb3(config);
  });

  beforeEach(async () => {
    const headContract = await deployAll(web3, config.nodePrivateKey, loggerMock);
    headContractAddress = headContract.options.address;
    builder = new Builder();
    await builder.build({...config, headContractAddress}, {web3});
    const [, hermesAddress] = await web3.eth.getAccounts();
    hermesUploadActions = (await prepareHermesSetup(web3, hermesAddress)).uploadActions;
    await onboardAtlas();
    createMockStrategy();
    builder.failedChallengesCache.failedChallengesEndTime = {};
    atlasWorker = new AtlasWorker(
      builder.web3,
      builder.dataModelEngine,
      builder.workerLogRepository,
      builder.challengesRepository,
      builder.workerTaskTrackingRepository,
      builder.failedChallengesCache,
      mockStrategy,
      loggerMock,
      builder.client,
      config.serverPort,
      config.requiredFreeDiskSpace,
      config.maxWorkerLogsCheckAgeInSeconds
    );
    if (!nock.isActive()) {
      nock.activate();
    }
    exampleBundle = createFullBundle(builder.identityManager, {}, [createFullAsset(builder.identityManager)]);
    await hermesUploadActions.uploadBundle(exampleBundle.bundleId, storagePeriods);
    nock(hermesUrl)
      .persist()
      .get(`/bundle/${exampleBundle.bundleId}/info`)
      .reply(200, {bundleId: exampleBundle.bundleId});
  });

  afterEach(async () => {
    await cleanDatabase(builder.db);
    nock.restore();
    nock.cleanAll();
  });

  it('reads a challenge and resolves it', async () => {
    nock(hermesUrl)
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, exampleBundle);

    await atlasWorker.periodicWork();
    expect(await builder.bundleRepository.getBundle(exampleBundle.bundleId)).to.deep.equal(exampleBundle);
  });

  it('performs only one work when starting two workers simultaneously', async () => {
    nock(hermesUrl)
      .persist()
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, exampleBundle);

    const firstWorkerPromise = atlasWorker.periodicWork();
    await atlasWorker.periodicWork();
    await firstWorkerPromise;
    expect(mockStrategy.shouldFetchBundle).to.be.calledOnce;
  });

  it('deletes downloaded bundle when it is not valid', async () => {
    nock(hermesUrl)
      .persist()
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, pick(exampleBundle, 'content.signature'));
    await atlasWorker.periodicWork();
    expect(await builder.bundleRepository.getBundle(exampleBundle.bundleId)).to.be.null;
  });

  it(`doesn't try to download a bundle in case it is already sheltered`, async () => {
    nock(hermesUrl)
      .persist()
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, exampleBundle);
    await atlasWorker.periodicWork();
    await atlasWorker.periodicWork();
    expect(mockStrategy.shouldFetchBundle).to.be.calledTwice;
    expect(mockStrategy.shouldResolveChallenge).to.be.calledOnce;
    expect(await builder.bundleRepository.getBundle(exampleBundle.bundleId)).to.deep.equal(exampleBundle);
    expect(await builder.bundleRepository.getBundleRepository(exampleBundle.bundleId)).to.deep
      .equal({status: BundleStatusStates.sheltered});
  });

  it('sets bundle status to DOWNLOADED if resolution has failed', async () => {
    nock(hermesUrl)
      .persist()
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, exampleBundle);
    await atlasWorker.periodicWork();
    await builder.bundleRepository.removeBundle(exampleBundle.bundleId);
    await atlasWorker.periodicWork();
    expect((await builder.bundleRepository.getBundleRepository(exampleBundle.bundleId)).status).to.equal(BundleStatusStates.downloaded);
  });

  after(async () => {
    builder.client.close();
  });
});
