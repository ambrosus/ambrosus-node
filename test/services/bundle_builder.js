/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import {ValidationError} from '../../src/errors/errors';

import IdentityManager from '../../src/services/identity_manager';
import BundleBuilder from '../../src/services/bundle_builder';

import {adminAccountWithSecret} from '../fixtures/account';
import {createFullAsset, createFullBundle, createFullEvent} from '../fixtures/assets_events';

import ScenarioBuilder from '../fixtures/scenario_builder';
import {getTimestamp} from '../../src/utils/time_utils';
import StringReadStream from '../../src/utils/string_read_stream';
import StringWriteStream from '../../src/utils/string_write_stream';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Bundle Builder', () => {
  let identityManager;
  let exampleAsset;
  let exampleEvent;
  let exampleBundle;
  let exampleBundleValidationSubset;
  let bundleBuilder;
  const bundleItemsCountLimit = 1000;
  const createMockStream = (bundle) => new StringReadStream(JSON.stringify(bundle), 10);

  before(async () => {
    identityManager = new IdentityManager(await createWeb3());
    exampleAsset = createFullAsset(identityManager);
    exampleEvent = createFullEvent(identityManager, {assetId: exampleAsset.assetId});
    exampleBundle = createFullBundle(identityManager, {}, [exampleAsset, exampleEvent]);
    exampleBundleValidationSubset = put(exampleBundle, 'content.entries', [{assetId: exampleAsset.assetId}, {eventId: exampleEvent.eventId}]);
  });

  it('extractIdsFromEntries returns an array of entry ids in same order', () => {
    expect(new BundleBuilder().extractIdsFromEntries(exampleBundle.content.entries)).to.deep.equal([exampleAsset.assetId, exampleEvent.eventId]);
  });

  describe('extractBundleDataNecessaryForValidationFromStream', () => {
    let bundleWithUnexpectedFields;
    before(() => {
      bundleWithUnexpectedFields = put(put(exampleBundle, 'foo', 'bar'), 'content.one', 1);
      bundleBuilder = new BundleBuilder();
    });

    it('returns bundle without entries content', async () => {
      expect(await bundleBuilder.extractBundleDataNecessaryForValidationFromStream(createMockStream(bundleWithUnexpectedFields))).to.deep.equal(
        put(bundleWithUnexpectedFields, 'content.entries', [{assetId: exampleAsset.assetId}, {eventId: exampleEvent.eventId}])
      );
    });

    it('resolves when empty object is passed', async () => {
      expect(await bundleBuilder.extractBundleDataNecessaryForValidationFromStream(createMockStream({}))).to.deep.equal({});
      expect(await bundleBuilder.extractBundleDataNecessaryForValidationFromStream(createMockStream('some string'))).to.deep.equal('some string');
    });

    it('throws when streamed data is not a correct JSON', async () => {
      await expect(bundleBuilder.extractBundleDataNecessaryForValidationFromStream(new StringReadStream('Shaun', 10))).to.be.rejected;
    });
  });

  describe('validateStreamedBundle', () => {
    let mockWriteStream;
    let mockReadStream;
    let fullValidationStub;
    let partialValidationStub;

    beforeEach(() => {
      mockWriteStream = new StringWriteStream();
      mockReadStream = createMockStream(exampleBundle);
      bundleBuilder = new BundleBuilder({}, {}, true);
      fullValidationStub = sinon.stub(bundleBuilder, 'validateBundle');
      partialValidationStub = sinon.stub(bundleBuilder, 'validateBundleWithVersionBefore3');
    });

    it('calls full validation when bundle has the latest version', async () => {
      await bundleBuilder.validateStreamedBundle(mockReadStream, mockWriteStream, 1);
      expect(fullValidationStub).to.be.calledOnceWith(exampleBundleValidationSubset);
      expect(partialValidationStub).to.be.not.called;
    });

    it('calls only partial validation when version is not latest and supportDeprecatedBundleVersions is set to true', async () => {
      mockReadStream = createMockStream(put(exampleBundle, 'content.idData.version', 2));
      await bundleBuilder.validateStreamedBundle(mockReadStream, mockWriteStream, 1);
      expect(fullValidationStub).to.be.not.called;
      expect(partialValidationStub).to.be.calledOnceWith(put(exampleBundleValidationSubset, 'content.idData.version', 2));
    });

    it('throws when version is not latest and supportDeprecatedBundleVersions is set to false', async () => {
      bundleBuilder.supportDeprecatedBundleVersions = false;
      mockReadStream = createMockStream(put(exampleBundle, 'content.idData.version', 2));
      await expect(bundleBuilder.validateStreamedBundle(mockReadStream, mockWriteStream, 1)).to.be.rejectedWith(ValidationError, 'Only bundles with version 3 are supported');
    });

    it('aborts the write and throws if the bundle download fails', async () => {
      mockWriteStream.abort = sinon.stub().callsFake((err) => {
        mockWriteStream.emit('error', err);
      });
      mockWriteStream.once('pipe', () => {
        mockReadStream.once('data', () => {
          mockReadStream.destroy(new Error('Download failed')); // simulate read stream failure
        });
      });
      await expect(bundleBuilder.validateStreamedBundle(mockReadStream, mockWriteStream, 1)).to.be.rejected;
      expect(mockWriteStream.abort).to.have.been.calledOnce;
    });
  });

  describe('validating', () => {
    let mockIdentityManager;

    before(() => {
      mockIdentityManager = {
        validateSignature: sinon.stub(),
        checkHashMatches: sinon.stub()
      };
      bundleBuilder = new BundleBuilder(mockIdentityManager);
    });

    beforeEach(() => {
      mockIdentityManager.validateSignature.reset();
      mockIdentityManager.validateSignature.returns();
      mockIdentityManager.checkHashMatches.reset();
      mockIdentityManager.checkHashMatches.returns(true);
    });

    it('passes for proper bundle', () => {
      expect(() => bundleBuilder.validateBundle(exampleBundle, bundleItemsCountLimit)).to.not.throw();
    });

    for (const field of [
      'bundleId',
      'content',
      'content.signature',
      'content.idData',
      'content.idData.createdBy',
      'content.idData.timestamp',
      'content.idData.entriesHash',
      'content.entries']) {
      // eslint-disable-next-line no-loop-func
      it(`throws if the ${field} field is missing`, () => {
        const brokenBundle = pick(exampleBundle, field);
        expect(() => bundleBuilder.validateBundle(brokenBundle, bundleItemsCountLimit)).to.throw(ValidationError);
      });
    }

    it('checks if bundleId matches the hash of idData (delegated to IdentityManager)', () => {
      mockIdentityManager.checkHashMatches.withArgs(exampleBundle.bundleId, exampleBundle.content.idData).returns(false);
      expect(() => bundleBuilder.validateBundle(exampleBundle, bundleItemsCountLimit)).to.throw(ValidationError);
    });

    it(`checks if entriesHash matches the hash of entries' ids (delegated to IdentityManager)`, () => {
      mockIdentityManager.checkHashMatches.withArgs(exampleBundle.content.idData.entriesHash,
        bundleBuilder.extractIdsFromEntries(exampleBundle.content.entries)).returns(false);
      expect(() => bundleBuilder.validateBundle(exampleBundle, bundleItemsCountLimit)).to.throw(ValidationError);
    });

    it('checks if signature is correct (delegated to IdentityManager)', () => {
      expect(() => bundleBuilder.validateBundle(exampleBundle, bundleItemsCountLimit)).to.not.throw();
      expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
    });

    it('throws if signature is incorrect (delegated to IdentityManager)', () => {
      mockIdentityManager.validateSignature.throws(new ValidationError('Signature is invalid'));

      expect(() => bundleBuilder.validateBundle(exampleBundle, bundleItemsCountLimit)).to.throw(ValidationError);
      expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
    });

    it(`allow metadata field`, () => {
      const exampleBundleWithMetadata = put(exampleBundle, 'metadata', 'abc');
      expect(() => bundleBuilder.validateBundle(exampleBundleWithMetadata, bundleItemsCountLimit)).not.to.throw();
    });

    it(`doesn't allow root-level fields other than content, metadata and bundleId`, () => {
      const brokenBundle = put(exampleBundle, 'extraField', 'abc');
      expect(() => bundleBuilder.validateBundle(brokenBundle, bundleItemsCountLimit)).to.throw(ValidationError);
    });

    it(`doesn't allow content fields other than idData, and signature`, () => {
      const brokenBundle = put(exampleBundle, 'content.extraField', 'abc');
      expect(() => bundleBuilder.validateBundle(brokenBundle, bundleItemsCountLimit)).to.throw(ValidationError);
    });

    it('throws if bundle has the version we do not expect', async () => {
      const brokenBundle = put(exampleBundle, 'content.idData.version', 3.14);
      expect(() => bundleBuilder.validateBundle(brokenBundle, bundleItemsCountLimit)).to.throw(ValidationError);
    });

    it('throws if entries count exceeds bundleItemsCountLimit', async () => {
      expect(() => bundleBuilder.validateBundle(exampleBundle, 1)).to.throw(ValidationError);
    });
  });

  describe('validating metadata', () => {
    const exampleBundleMetadata = {
      bundleId: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d2',
      bundleUploadTimestamp: 1544171039,
      bundleProofBlock: 120,
      bundleTransactionHash: '0xbfa90258fe2badae4cce5316161cdc1f6eccb5d47f0904adafca120e142c9c3e',
      storagePeriods: 3
    };

    before(() => {
      bundleBuilder = new BundleBuilder();
    });

    it('passes for proper bundle metadata', () => {
      expect(() => bundleBuilder.validateBundleMetadata(exampleBundleMetadata)).to.not.throw();
    });

    it('passes for bundle metadata that contains only bundleId', async () => {
      expect(() => bundleBuilder.validateBundleMetadata({bundleId: exampleBundleMetadata.bundleId})).to.not.throw();
    });

    it('throws if the bundleId field is missing', () => {
      const brokenMetadata = pick(exampleBundleMetadata, 'bundleId');
      expect(() => bundleBuilder.validateBundleMetadata(brokenMetadata)).to.throw(ValidationError);
    });

    it('throws if bundleId does not have the correct format', async () => {
      const brokenMetadata = {...exampleBundleMetadata, bundleId: '0xIncorrectValue'};
      expect(() => bundleBuilder.validateBundleMetadata(brokenMetadata)).to.throw(ValidationError);
    });
  });

  describe('Assembling', () => {
    let mockIdentityManager;
    let mockEntityBuilder;

    let scenario;

    let inAssets;
    let inEvents;
    let inTimestamp;
    const inSecret = 'inSecret';
    const mockAddress = 'mockAddress';
    const mockHash1 = 'mockHash1';
    const mockHash2 = 'mockHash2';
    const mockSignature = 'mockSignature';
    let inAssetsStripped;
    let inEventsStripped;
    let inEventsStubbed;

    let ret;

    before(async () => {
      mockIdentityManager = {
        calculateHash: sinon.stub(),
        sign: sinon.stub(),
        addressFromSecret: sinon.stub()
      };
      mockEntityBuilder = {
        prepareEventForBundlePublication: sinon.stub(),
        removeBundle: sinon.stub()
      };
      bundleBuilder = new BundleBuilder(mockIdentityManager, mockEntityBuilder);

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);

      inAssets = [
        await scenario.addAsset(0),
        await scenario.addAsset(0)
      ];
      inEvents = [
        await scenario.addEvent(0, 0, {accessLevel: 0}),
        await scenario.addEvent(0, 1, {accessLevel: 0}),
        await scenario.addEvent(0, 1, {accessLevel: 1})
      ];
      inTimestamp = getTimestamp();
      const stripFunc = (entry) => put(entry, 'mock.bundleStripped', 1);
      inAssetsStripped = inAssets.map(stripFunc);
      inEventsStripped = inEvents.map(stripFunc);
      const prepFunc = (entry) => put(entry, 'mock.stub', 1);
      inEventsStubbed = inEventsStripped.map(prepFunc);

      mockIdentityManager.addressFromSecret.returns(mockAddress);
      mockIdentityManager.calculateHash.onFirstCall().returns(mockHash1);
      mockIdentityManager.calculateHash.onSecondCall().returns(mockHash2);
      mockIdentityManager.sign.returns(mockSignature);
      mockEntityBuilder.removeBundle.callsFake(stripFunc);
      mockEntityBuilder.prepareEventForBundlePublication.callsFake(prepFunc);

      ret = bundleBuilder.assembleBundle(inAssets, inEvents, inTimestamp, inSecret);
    });

    it('strips the bundleId metadata link using the removeBundle method', () => {
      expect(mockEntityBuilder.removeBundle).to.have.callCount(inAssets.length + inEvents.length);
    });

    it('calculates event stubs', () => {
      expect(mockEntityBuilder.prepareEventForBundlePublication).to.have.callCount(inEvents.length);
    });

    it('places event stubs and untouched assets into the entries field', () => {
      expect(ret.content.entries).to.deep.include.members(inAssetsStripped);
      expect(ret.content.entries).to.deep.include.members(inEventsStubbed);
      expect(ret.content.entries).to.have.lengthOf(inAssets.length + inEvents.length);
    });

    it('asks the identity manager for the address of the provided secret and put it into idData.createdBy', () => {
      expect(mockIdentityManager.addressFromSecret).to.have.been.calledWith(inSecret);
      expect(ret.content.idData.createdBy).to.be.equal(mockAddress);
    });

    it('puts the provided timestamp into idData.timestamp', () => {
      expect(ret.content.idData.timestamp).to.be.equal(inTimestamp);
    });

    it('puts latest version into idData.version', () => {
      expect(ret.content.idData.version).to.be.equal(3);
    });

    it('orders the identity manager to calculate the entriesHash and put it into idData', () => {
      expect(mockIdentityManager.calculateHash).to.have.been.calledWith(bundleBuilder.extractIdsFromEntries(ret.content.entries));
      expect(ret.content.idData.entriesHash).to.be.equal(mockHash1);
    });

    it('orders the identity manager to sign the the idData part', () => {
      expect(mockIdentityManager.sign).to.have.been.calledWith(inSecret, ret.content.idData);
      expect(ret.content.signature).to.be.equal(mockSignature);
    });

    it('orders the identity manager to calculate the bundleId', () => {
      expect(mockIdentityManager.calculateHash).to.have.been.calledWith(ret.content.idData);
      expect(ret.bundleId).to.be.equal(mockHash2);
    });
  });
});
