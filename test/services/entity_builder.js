import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';

import EntityBuilder from '../../src/services/entity_builder';
import {createFullEvent, createFullAsset} from '../fixtures/assets_events';
import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('Entity Builder', () => {
  let exampleAsset;
  let exampleEvent;

  before(async () => {
    const identityManager = new IdentityManager(await createWeb3());
    exampleAsset = createFullAsset(identityManager);
    exampleEvent = createFullEvent(identityManager, {assetId: exampleAsset.assetId});
  });

  describe('validating', () => {
    let mockIdentityManager;
    let entityBuilder;

    before(() => {
      mockIdentityManager = {
        validateSignature: sinon.stub()
      };
      entityBuilder = new EntityBuilder(mockIdentityManager);
    });

    beforeEach(() => {
      mockIdentityManager.validateSignature.resetHistory();
      mockIdentityManager.validateSignature.returns(); 
    });

    describe('asset', () => {
      for (const field of ['assetId', 'content', 'content.signature', 'content.idData', 'content.idData.createdBy', 'content.idData.timestamp', 'content.idData.sequenceNumber']) {
        // eslint-disable-next-line no-loop-func
        it(`throws if the ${field} field is missing`, () => {
          const brokenAsset = pick(exampleAsset, field);
          expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
        });
      }

      it('uses the IdentityManager for checking signature (correct)', () => {
        expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw();
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      it('uses the IdentityManager for checking signature (incorrect)', () => {
        mockIdentityManager.validateSignature.throws(new ValidationError('Signature is invalid'));

        expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      it('passes for proper asset', () => {
        expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw();
      });

      it('doesn\'t allow root-level fields other than content, and assetId', () => {
        const brokenAsset = put(exampleAsset, 'metadata', 'abc');
        expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
      });
    });

    describe('event', () => {
      for (const field of ['eventId', 'content', 'content.signature', 'content.idData', 'content.idData.assetId', 'content.idData.createdBy', 'content.idData.timestamp', 'content.idData.dataHash', 'content.data']) {
        // eslint-disable-next-line no-loop-func
        it(`throws if the ${field} field is missing`, () => {
          const brokenEvent = pick(exampleEvent, field);
          expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        });
      }

      it('uses the IdentityManager for checking signature (correct)', () => {
        expect(() => entityBuilder.validateEvent(exampleEvent)).to.not.throw();
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      it('uses the IdentityManager for checking signature (incorrect)', () => {
        mockIdentityManager.validateSignature.throws(new ValidationError('Signature is invalid'));

        expect(() => entityBuilder.validateEvent(exampleEvent)).to.throw(ValidationError);
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      it('passes for proper event', () => {
        expect(() => entityBuilder.validateEvent(exampleEvent)).to.not.throw();
      });

      it('doesn\'t allow root-level fields other than content, and eventId', () => {
        const brokenEvent = put(exampleEvent, 'metadata', 'abc');
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
      });
    });
  });

  describe('Manipulating bundle id in metadata', () => {
    let entityBuilder;

    before(() => {
      entityBuilder = new EntityBuilder({});
    });

    describe('Setting works', () => {
      it('for assets', () => {
        const assetWithBundle = entityBuilder.setBundle(exampleAsset, 'abc');
        expect(assetWithBundle.metadata.bundleId).to.equal('abc');
      });

      it('for events', () => {
        const eventWithBundle = entityBuilder.setBundle(exampleEvent, '123');
        expect(eventWithBundle.metadata.bundleId).to.equal('123');
      });
    });

    describe('Removing works', () => {
      it('for assets', () => {
        const assetWithBundle = entityBuilder.setBundle(exampleAsset, 'abc');
        const assetWithoutBundle = entityBuilder.removeBundle(assetWithBundle);
        expect(assetWithoutBundle).to.deep.equal(exampleAsset);
      });

      it('for events', () => {
        const eventWithBundle = entityBuilder.setBundle(exampleEvent, '123');
        const eventWithoutBundle = entityBuilder.removeBundle(eventWithBundle);
        expect(eventWithoutBundle).to.deep.equal(exampleEvent);
      });
    });
  });


  describe('Assembling a bundle', async () => {
    let mockIdentityManager;
    let entityBuilder;

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

    let ret;

    before(async () => {
      mockIdentityManager = {
        calculateHash: sinon.stub(),
        sign: sinon.stub(),
        addressFromSecret: sinon.stub()
      };
      entityBuilder = new EntityBuilder(mockIdentityManager);

      inAssets = ['inAsset1', 'inAsset2'];
      inEvents = ['inEvent1', 'inEvent2', 'inEvent3'];
      inTimestamp = Date.now();
      const stripFunc = (entry) => `${entry}_stripped`;
      inAssetsStripped = inAssets.map(stripFunc);
      inEventsStripped = inEvents.map(stripFunc);

      mockIdentityManager.addressFromSecret.returns(mockAddress);
      mockIdentityManager.calculateHash.onFirstCall().returns(mockHash1);
      mockIdentityManager.calculateHash.onSecondCall().returns(mockHash2);
      mockIdentityManager.sign.returns(mockSignature);
      sinon.stub(entityBuilder, 'removeBundle');
      entityBuilder.removeBundle.callsFake(stripFunc);

      ret = entityBuilder.assembleBundle(inAssets, inEvents, inTimestamp, inSecret);
    });

    after(() => {
      entityBuilder.removeBundle.restore();
    });

    it('strips the bundleId metadata link using the removeBundle method', () => {
      expect(entityBuilder.removeBundle).to.have.callCount(inAssets.length + inEvents.length);
    });

    it('calculates event stubs and places them into entries', () => {
      expect(ret.content.entries).to.deep.include.members(inAssetsStripped);
      expect(ret.content.entries).to.deep.include.members(inEventsStripped);
      expect(ret.content.entries).to.have.lengthOf(inAssets.length + inEvents.length);
    });

    it('asks the identity manager for the address of the provided secret and put it into idData.createdBy', () => {
      expect(mockIdentityManager.addressFromSecret).to.have.been.calledWith(inSecret);
      expect(ret.content.idData.createdBy).to.be.equal(mockAddress);
    });

    it('puts the provided timestamp into idData.timestamp', () => {
      expect(ret.content.idData.timestamp).to.be.equal(inTimestamp);
    });

    it('orders the identity manager to calculate the entriesHash and put it into idData', () => {
      expect(mockIdentityManager.calculateHash).to.have.been.calledWith(ret.content.entries);
      expect(ret.content.idData.entriesHash).to.be.equal(mockHash1);
    });

    it('orders the identity manager to sign the the idData part', () => {
      expect(mockIdentityManager.sign).to.have.been.calledWith(inSecret, ret.content.idData);
      expect(ret.content.signature).to.be.equal(mockSignature);
    });

    it('orders the identity manager to calculate the bundleId', () => {
      expect(mockIdentityManager.calculateHash).to.have.been.calledWith(ret.content);
      expect(ret.bundleId).to.be.equal(mockHash2);
    });
  });
});
