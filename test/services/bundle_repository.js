/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';
import {createBundle} from '../fixtures/assets_events';
import config from '../../config/config';

import BundleRepository from '../../src/services/bundle_repository';
import StringReadStream from '../../src/utils/string_read_stream';

const {expect} = chai;
chai.use(chaiAsPromised);

const BUNDLE_VERSION = 2;

const asyncPipe = async (readStream, writeStream) => new Promise((resolve, reject) => {
  writeStream.on('finish', () => resolve());
  writeStream.on('error', (err) => reject(err));
  readStream.pipe(writeStream);
});

describe('Bundle Repository', () => {
  let db;
  let client;
  let storage;
  const storagePeriods = 5;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new BundleRepository(db);
  });

  after(async () => {
    await cleanDatabase(db);
    client.close();
  });

  describe('Storing directly', () => {
    const txHash = '0xc9087b7510e98183f705fe99ddb6964f3b845878d8a801cf6b110975599b6009';

    after(async () => {
      await cleanDatabase(db);
    });

    it('db round trip works', async () => {
      const exampleBundleId = '0xabcdef';
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      await storage.storeBundle(exampleBundle, storagePeriods);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.deep.equal({bundleId: exampleBundleId, storagePeriods, version: BUNDLE_VERSION});
      await storage.storeBundleProofMetadata(exampleBundleId, 10, 50, txHash, BUNDLE_VERSION);
      await expect(storage.getBundle(exampleBundleId), 'bundle after proof').to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId), 'bundle metadata after proof').to.eventually.deep.equal({
        bundleId: exampleBundleId,
        bundleProofBlock: 10,
        bundleTransactionHash: txHash,
        bundleUploadTimestamp: 50,
        version: BUNDLE_VERSION,
        storagePeriods
      });
    });

    it('returns null for non-existing bundle', async () => {
      const otherBundleId = '0x33333';
      await expect(storage.getBundle(otherBundleId)).to.eventually.be.equal(null);
      await expect(storage.getBundleMetadata(otherBundleId)).to.eventually.be.equal(null);
    });
  });

  describe('getBundleStream', () => {
    const exampleBundleId = '0xabcdef';

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('returns the stream if the bundle exists', async () => {
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      await storage.storeBundle(exampleBundle, storagePeriods);
      await expect(storage.getBundleStream(exampleBundleId)).to.eventually.be.not.null;
    });

    it(`returns null if the bundle doesn't exist`, async () => {
      await expect(storage.getBundleStream(exampleBundleId)).to.eventually.be.null;
    });
  });

  describe('openBundleWriteStream', () => {
    const exampleBundleId = '0xabcdef';

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('stores the streamed bundle', async () => {
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      const exampleBundleReadStream = new StringReadStream(JSON.stringify(exampleBundle));
      const writeStream = await storage.openBundleWriteStream(exampleBundleId, storagePeriods);
      await asyncPipe(exampleBundleReadStream, writeStream);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.deep.equal({bundleId: exampleBundleId, storagePeriods});
    });

    it(`discards the bundle if the write stream gets aborted`, async () => {
      const writeStream = await storage.openBundleWriteStream(exampleBundleId, storagePeriods);
      await writeStream.abort();
      await expect(storage.getBundle(exampleBundleId)).to.eventually.be.null;
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.be.null;
    });
  });

  describe('Cleanup process', () => {
    describe('Set bundle expiration date', () => {
      const bundleId = 'bundle';
      const expirationDate = 10;

      beforeEach(async () => {
        await storage.storeBundle(put(createBundle(), 'bundleId', bundleId), storagePeriods);
      });

      afterEach(async () => {
        await cleanDatabase(db);
      });

      it('storeBundleShelteringExpirationDate sets holdUntil field in the metadata', async () => {
        await storage.storeBundleShelteringExpirationDate(bundleId, expirationDate);
        const metadata = await storage.db.collection('bundle_metadata').findOne({bundleId});
        expect(metadata.holdUntil).to.equal(expirationDate);
      });
    });
  });

  describe('Finding bundles waiting for upload', () => {
    beforeEach(async () => {
      await storage.storeBundle({...createBundle(), bundleId: 'bundle1'}, storagePeriods);
      await storage.storeBundle({...createBundle(), bundleId: 'bundle2'}, storagePeriods);
      await storage.storeBundle({...createBundle(), bundleId: 'bundle3'}, storagePeriods);
      await storage.storeBundleProofMetadata('bundle2', '0', '0');
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('returns bundles without a upload proof', async () => {
      const notRegisteredBundles = await storage.findBundlesWaitingForUpload();
      expect(notRegisteredBundles).to.have.length(2);
      expect(notRegisteredBundles[0].bundleId).to.equal('bundle1');
      expect(notRegisteredBundles[1].bundleId).to.equal('bundle3');
    });
  });

  describe('Removing', () => {
    beforeEach(async () => {
      await storage.storeBundle({...createBundle(), bundleId: 'bundle1'}, storagePeriods);
      await storage.storeBundle({...createBundle(), bundleId: 'bundle2'}, storagePeriods);
      await storage.storeBundleProofMetadata('bundle2', '0', '0');
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('deletes the entry from the metadata collection', async () => {
      await expect(storage.removeBundle('bundle1')).to.eventually.be.fulfilled;
      expect(await storage.getBundleMetadata('bundle1')).to.be.null;
      expect(await storage.getBundleMetadata('bundle2')).to.not.be.null;
      await expect(storage.removeBundle('bundle2')).to.eventually.be.fulfilled;
      expect(await storage.getBundleMetadata('bundle2')).to.be.null;
    });

    it('deletes the entry from the gridfs bucket', async () => {
      await expect(storage.removeBundle('bundle1')).to.eventually.be.fulfilled;
      expect(await storage.getBundle('bundle1')).to.be.null;
      expect(await storage.getBundle('bundle2')).to.not.be.null;
      await expect(storage.removeBundle('bundle2')).to.eventually.be.fulfilled;
      expect(await storage.getBundle('bundle2')).to.be.null;
    });
  });
});
