import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';

import EntityBuilder from '../../src/services/entity_builder';
import {createFullAsset, createFullEvent} from '../fixtures/assets_events';
import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('Entity Builder', () => {
  let entityBuilder = null;
  let mockIdentityManager = null;
  let exampleAsset = null;
  let exampleEvent = null;

  before(async () => {
    const identityManager = new IdentityManager(await createWeb3());
    exampleAsset = createFullAsset(identityManager);
    exampleEvent = createFullEvent(identityManager, {assetId: exampleAsset.assetId});
  });

  beforeEach(() => {
    mockIdentityManager = {
      validateSignature: sinon.stub(),
      calculateHash: sinon.stub()
    };
    entityBuilder = new EntityBuilder(mockIdentityManager);
  });

  describe('validating an asset', () => {
    for (const field of [
      'assetId',
      'content',
      'content.signature',
      'content.idData',
      'content.idData.createdBy',
      'content.idData.timestamp',
      'content.idData.sequenceNumber']) {
      // eslint-disable-next-line no-loop-func
      it(`throws if the ${field} field is missing`, () => {
        const brokenAssset = pick(exampleAsset, field);
        expect(() => entityBuilder.validateAsset(brokenAssset)).to.throw(ValidationError);
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
      const brokenAssset = put(exampleAsset, 'metadata', 'abc');
      expect(() => entityBuilder.validateAsset(brokenAssset)).to.throw(ValidationError);
    });
  });

  it('setting the bundle Id for an asset', () => {
    const modifiedAsset = entityBuilder.setAssetBundle(exampleAsset, 'abc');
    expect(modifiedAsset.metadata.bundleId).to.equal('abc');
  });

  describe('validating an event', () => {
    for (const field of [
      'eventId',
      'content',
      'content.signature',
      'content.idData',
      'content.idData.assetId',
      'content.idData.createdBy',
      'content.idData.timestamp',
      'content.idData.dataHash',
      'content.data']) {
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

  it('setting the bundle Id for an event', () => {
    const modifiedEvent = entityBuilder.setEventBundle(exampleEvent, '123');
    expect(modifiedEvent.metadata.bundleId).to.equal('123');
  });
});
