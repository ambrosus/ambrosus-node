/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';
import {createBundle} from '../fixtures/assets_events';
import config from '../../src/config/config';

import BundleRepository from '../../src/services/bundle_repository';
import StringReadStream from '../../src/utils/string_read_stream';
import BundleStatuses from '../../src/utils/bundle_statuses';

const {expect} = chai;
chai.use(chaiAsPromised);

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

  const storeBundleWithRepo = async (bundleId, status, metadata) => {
    await storage.storeBundle({...createBundle(), bundleId}, 10);
    if (!status) {
      return;
    }
    await storage.setBundleRepository(bundleId, status, metadata);
  };
  const getMetadataWithoutId = async (bundleId) => db.collection('bundle_metadata').findOne({bundleId}, {projection: {_id: 0}});
  const getBundleStatus = async (bundleId) => (await storage.getBundleRepository(bundleId)).status;


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
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.deep.equal({bundleId: exampleBundleId, storagePeriods});
      await storage.storeBundleProofMetadata(exampleBundleId, 10, 50, txHash);
      await expect(storage.getBundle(exampleBundleId), 'bundle after proof').to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId), 'bundle metadata after proof').to.eventually.deep.equal({
        bundleId: exampleBundleId,
        bundleProofBlock: 10,
        bundleTransactionHash: txHash,
        bundleUploadTimestamp: 50,
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
      const writeStream = await storage.openBundleWriteStream(exampleBundleId);
      await asyncPipe(exampleBundleReadStream, writeStream);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.deep.equal(exampleBundle);
    });

    it(`discards the bundle if the write stream gets aborted`, async () => {
      const writeStream = await storage.openBundleWriteStream(exampleBundleId, storagePeriods);
      await writeStream.abort();
      await expect(storage.getBundle(exampleBundleId)).to.eventually.be.null;
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.be.null;
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

  describe('Create bundle metadata', () => {
    const bundleId = '0xdeadBeef';

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('creates metadata with bundleId and storagePeriods and status if it does not exist', async () => {
      await storage.createBundleMetadata(bundleId, storagePeriods, BundleStatuses.shelteringCandidate);
      expect(await getMetadataWithoutId(bundleId)).to.deep.equal({bundleId, storagePeriods, repository: {status: BundleStatuses.shelteringCandidate}});
    });

    it('creates metadata with bundleId and storagePeriods and repository with status and additional fields if it does not exist', async () => {
      await storage.createBundleMetadata(bundleId, storagePeriods, BundleStatuses.shelteringCandidate, {foo: 'bar'});
      expect(await getMetadataWithoutId(bundleId)).to.deep.equal({bundleId, storagePeriods, repository: {status: BundleStatuses.shelteringCandidate, foo: 'bar'}});
    });

    it('does nothing if metadata with same bundleId already exists', async () => {
      await storage.createBundleMetadata(bundleId, storagePeriods);
      await storage.createBundleMetadata(bundleId, storagePeriods + 1, BundleStatuses.downloaded);
      expect(await getMetadataWithoutId(bundleId)).to.deep.equal({bundleId, storagePeriods, repository: {status: BundleStatuses.unknown}});
    });

    it('getBundleMetadata returns metadata without repository field', async () => {
      await storage.createBundleMetadata(bundleId, storagePeriods);
      expect(await storage.getBundleMetadata(bundleId)).to.deep.equal({bundleId, storagePeriods});
    });
  });

  describe('Additional Metadata Fields', () => {
    const initialMetadata = {
      bundleId: '0x1',
      bundleTransactionHash: '0x2',
      bundleProofBlock: 10,
      bundleUploadTimestamp: 12,
      storagePeriods: 2,
      repository: {status: BundleStatuses.shelteringCandidate}
    };
    const downloadedBundleMetadata = {
      bundleTransactionHash: '0x2423', // should not overwrite
      bundleProofBlock: 15, // should not overwrite
      storagePeriods: 7, // should not overwrite
      bundleUploadTimestamp: 12, // should not overwrite
      repository: {status: 'BADSTATUS', foo: 'bar'}, // should not overwrite
      additionalField: 'field'
    };

    it('returns fields not present in initial metadata', () => {
      expect(storage.additionalMetadataFields(initialMetadata, downloadedBundleMetadata)).to.deep.equal({additionalField: 'field'});
    });
  });

  describe('Update Bundle Metadata', () => {
    const initialMetadata = {bundleId: '0x1'};

    beforeEach(async () => {
      await db.collection('bundle_metadata').insertOne({...initialMetadata});
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('adds additional fields', async () => {
      await storage.updateBundleMetadata(initialMetadata.bundleId, {foo: 'bar'});
      expect(await storage.getBundleMetadata(initialMetadata.bundleId)).to.deep.equal({...initialMetadata, foo: 'bar'});
    });

    it('works when no additional fields provided', async () => {
      await storage.updateBundleMetadata(initialMetadata.bundleId, {});
      expect(await storage.getBundleMetadata(initialMetadata.bundleId)).to.deep.equal(initialMetadata);
    });
  });

  describe('Bundle repository', () => {
    const bundleId = '0xdeadBeef';

    beforeEach(async () => {
      await storage.createBundleMetadata(bundleId, storagePeriods);
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('sets status in bundle metadata repository', async () => {
      await storage.setBundleRepository(bundleId, 'OtherStatus');
      expect(await storage.getBundleRepository(bundleId)).to.deep.equal({status: 'OtherStatus'});
    });

    it('sets additional fields in bundle metadata repository', async () => {
      await storage.setBundleRepository(bundleId, 'OtherStatus', {additionalField: 123});
      expect(await storage.getBundleRepository(bundleId)).to.deep.equal({status: 'OtherStatus', additionalField: 123});
    });

    it('getBundleRepository returns null if metadata fot this bundleId does not exist', async () => {
      expect(await storage.getBundleRepository('unknownId')).to.be.null;
    });
  });

  describe('isBundleSheltered', () => {
    const shelteredBundleId = '0x1';
    const notShelteredBundleId = '0x2';

    beforeEach(async () => {
      await storage.createBundleMetadata(shelteredBundleId, storagePeriods);
      await storage.createBundleMetadata(notShelteredBundleId, storagePeriods);
      await storage.setBundleRepository(shelteredBundleId, BundleStatuses.sheltered);
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('returns true if bundle is sheltered', async () => {
      expect(await storage.isBundleSheltered(shelteredBundleId)).to.be.true;
    });

    it('returns false if bundle is stored but not sheltered', async () => {
      expect(await storage.isBundleSheltered(notShelteredBundleId)).to.be.false;
    });

    it('returns false if bundle is not stored', async () => {
      expect(await storage.isBundleSheltered('not stored bundle')).to.be.false;
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

    it('deletes the entry from the gridfs bucket', async () => {
      await expect(storage.removeBundle('bundle1')).to.eventually.be.fulfilled;
      expect(await storage.getBundle('bundle1')).to.be.null;
      expect(await storage.getBundle('bundle2')).to.not.be.null;
      await expect(storage.removeBundle('bundle2')).to.eventually.be.fulfilled;
      expect(await storage.getBundle('bundle2')).to.be.null;
    });

    it('sets bundle status in metadata to expandable', async () => {
      await expect(storage.removeBundle('bundle1')).to.eventually.be.fulfilled;
      expect(await storage.getBundleRepository('bundle1')).to.deep.equal({status: BundleStatuses.expendable});
      expect(await storage.getBundleMetadata('bundle1')).to.be.not.null;
    });
  });

  describe('findOutdatedBundles', () => {
    const now = 1543210987;
    let clock;

    beforeEach(async () => {
      clock = sinon.useFakeTimers(now);
      await storeBundleWithRepo('bundle0');
      await storeBundleWithRepo('bundle1', BundleStatuses.downloaded, {holdUntil: new Date(now + 1)});
      await storeBundleWithRepo('bundle2', BundleStatuses.sheltered, {holdUntil: new Date(now)});
      await storeBundleWithRepo('bundle3', BundleStatuses.cleanup);
      await storeBundleWithRepo('bundle4', BundleStatuses.downloaded, {holdUntil: new Date(now - 1)});
      await storeBundleWithRepo('bundle5', BundleStatuses.sheltered, {holdUntil: new Date(now - 2)});
      await storeBundleWithRepo('bundle6', BundleStatuses.expendable);
    });

    it('sets all bundles with expired holdUntil field or without a repository status to CLEANUP', async () => {
      await storage.findOutdatedBundles();

      expect(await getBundleStatus('bundle0')).to.equal(BundleStatuses.cleanup);
      expect(await getBundleStatus('bundle1')).to.equal(BundleStatuses.downloaded);
      expect(await getBundleStatus('bundle2')).to.equal(BundleStatuses.sheltered);
      expect(await getBundleStatus('bundle3')).to.equal(BundleStatuses.cleanup);
      expect(await getBundleStatus('bundle4')).to.equal(BundleStatuses.cleanup);
      expect(await getBundleStatus('bundle5')).to.equal(BundleStatuses.cleanup);
      expect(await getBundleStatus('bundle6')).to.equal(BundleStatuses.expendable);
    });

    afterEach(async () => {
      await cleanDatabase(db);
      clock.restore();
    });
  });

  describe('cleanupBundles', () => {
    beforeEach(async () => {
      await storeBundleWithRepo('bundle0');
      await storeBundleWithRepo('bundle1', BundleStatuses.downloaded);
      await storeBundleWithRepo('bundle2', BundleStatuses.sheltered);
      await storeBundleWithRepo('bundle3', BundleStatuses.cleanup);
      await storeBundleWithRepo('bundle4', BundleStatuses.downloaded);
      await storeBundleWithRepo('bundle5', BundleStatuses.cleanup);
    });

    it('removes all bundles having status CLEANUP', async () => {
      await storage.cleanupBundles();

      expect(await storage.getBundle('bundle0')).to.be.not.null;
      expect(await storage.getBundle('bundle1')).to.be.not.null;
      expect(await storage.getBundle('bundle2')).to.be.not.null;
      expect(await storage.getBundle('bundle3')).to.be.null;
      expect(await storage.getBundle('bundle4')).to.be.not.null;
      expect(await storage.getBundle('bundle5')).to.be.null;
    });

    it('sets removed bundle status to EXPENDABLE', async () => {
      await storage.cleanupBundles();

      expect(await storage.getBundleRepository('bundle0')).to.be.undefined;
      expect(await getBundleStatus('bundle1')).to.equal(BundleStatuses.downloaded);
      expect(await getBundleStatus('bundle2')).to.equal(BundleStatuses.sheltered);
      expect(await getBundleStatus('bundle3')).to.equal(BundleStatuses.expendable);
      expect(await getBundleStatus('bundle4')).to.equal(BundleStatuses.downloaded);
      expect(await getBundleStatus('bundle5')).to.equal(BundleStatuses.expendable);
    });

    it('returns removed bundles count', async () => {
      expect(await storage.cleanupBundles()).to.equal(2);
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });
  });
});
