import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus from '../helpers/apparatus';
import chaiHttp from 'chai-http';
import {put} from '../../src/utils/dict_utils';

import {createBundle, createAsset} from '../fixtures/assets_events';


chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundles - Integrations', () => {
  let apparatus;
  const exampleBundleId = '0xabcdef';
  const exampleEntries = [createAsset(), createAsset()];
  const exampleBundle = put(createBundle(), {bundleId : exampleBundleId, entries : exampleEntries});

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();

    await apparatus.entityRepository.storeBundle(exampleBundle);
  });

  describe('getting bundles', () => {
    it('should get bundle by id', async () => {
      const response = await apparatus.request()
        .get(`/bundle/${exampleBundleId}`);
      expect(response.body.content).to.deep.equal(exampleBundle.content);
      expect(response.body.bundleId).to.deep.equal(exampleBundleId);
      expect(response.body.entries).to.deep.equal(exampleEntries);
    });

    it('return 404 if bundle with requested id does not exist', async () => {
      const request = apparatus.request()
        .get(`/bundle/nonexistingBundle`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  after(async () => {
    await apparatus.cleanDB();
    apparatus.stop();
  });
});
