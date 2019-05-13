/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Builder from '../../../src/builder';
import config from '../../../config/config';
import devConfig from '../../../config/devConfig';
import AtlasWorker from '../../../src/workers/atlas_worker';
import {createFullAsset, createFullBundle} from '../../fixtures/assets_events';
import ResolveAllStrategy from '../../../src/workers/atlas_strategies/resolve_all_strategy';
import chaiHttp from 'chai-http';
import {cleanDatabase} from '../../../src/utils/db_utils';
import deployAll from '../../../src/utils/deployment';
import {createWeb3} from '../../../src/utils/web3_tools';
import {addToKycWhitelist} from '../../../src/utils/prerun';
import {Role} from '../../../src/services/roles_repository';
import Web3 from 'web3';
import nock from 'nock';

chai.use(chaiAsPromised);
chai.use(chaiHttp);
const {expect} = chai;

describe('Atlas worker - integration', () => {
  let atlasWorker;
  let web3;
  let builder;
  let exampleBundle;
  let hermesUploadActions;
  const hermesUrl = 'http://hermes.com';
  const atlasUrl = 'http://atlas.com';
  const storagePeriods = 8;
  const loggerMock = {
    info: () => {},
    error: () => {}
  };

  const prepareHermesSetup = async (web3, hermesAddress, headContractAddress) => {
    const hermesWeb3 = new Web3(web3.currentProvider);
    hermesWeb3.eth.defaultAccount = hermesAddress;
    const hermesBuilder = new Builder();
    await hermesBuilder.build({...config, headContractAddress}, {web3: hermesWeb3});
    await addToKycWhitelist(Role.HERMES, '0', hermesBuilder.dataModelEngine, builder.kycWhitelistWrapper, loggerMock);
    await hermesBuilder.rolesRepository.onboardAsHermes(hermesBuilder.identityManager.nodeAddress(), hermesUrl);
    return hermesBuilder;
  };

  const onboardAtlas = async () => {
    await addToKycWhitelist(Role.ATLAS, web3.utils.toWei('10000', 'ether'), builder.dataModelEngine, builder.kycWhitelistWrapper, loggerMock);
    await builder.rolesRepository.onboardAsAtlas(builder.identityManager.nodeAddress(), atlasUrl);
  };

  beforeEach(async () => {
    web3 = await createWeb3(config);
    builder = new Builder();
    const headContract = await deployAll(web3, config.nodePrivateKey, loggerMock);
    await builder.build({...config, headContractAddress: headContract.options.address}, {web3});
    const strategy = new ResolveAllStrategy();
    atlasWorker = new AtlasWorker(
      builder.web3,
      builder.dataModelEngine,
      builder.workerLogRepository,
      builder.challengesRepository,
      builder.workerTaskTrackingRepository,
      builder.failedChallengesCache,
      strategy,
      loggerMock,
      builder.client,
      config.serverPort,
      config.requiredFreeDiskSpace
    );
    const [, hermesAddress] = await web3.eth.getAccounts();
    hermesUploadActions = (await prepareHermesSetup(web3, hermesAddress, headContract.options.address)).uploadActions;
    await onboardAtlas();
    exampleBundle = createFullBundle(builder.identityManager, {}, [createFullAsset(builder.identityManager)]);
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(async () => {
    await cleanDatabase(builder.db);
    nock.restore();
    nock.cleanAll();
  });

  it('reads a challenge and resolves it', async () => {
    nock(hermesUrl)
      .get(`/bundle/${exampleBundle.bundleId}/info`)
      .reply(200, {bundleId: exampleBundle.bundleId});
    nock(hermesUrl)
      .get(`/bundle/${exampleBundle.bundleId}`)
      .reply(200, exampleBundle);
    await hermesUploadActions.uploadBundle(exampleBundle.bundleId, storagePeriods);
    await atlasWorker.periodicWork();
    expect(await builder.bundleRepository.getBundle(exampleBundle.bundleId)).to.deep.equal(exampleBundle);
  });

  after(async () => {
    builder.client.close();
  });
});
