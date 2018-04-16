import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import {InvalidParametersError, ValidationError, JsonValidationError} from '../../src/errors/errors';

import IdentityManager from '../../src/services/identity_manager';
import EntityBuilder from '../../src/services/entity_builder';

import {adminAccountWithSecret} from '../fixtures/account';
import {createFullAsset, createFullEvent} from '../fixtures/assets_events';

import ScenarioBuilder from '../fixtures/scenario_builder';
import {getTimestamp} from '../../src/utils/time_utils';

chai.use(sinonChai);
const {expect} = chai;

describe('Entity Builder', () => {
  let identityManager;
  let exampleAsset;
  let exampleEvent;

  before(async () => {
    identityManager = new IdentityManager(await createWeb3());
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

    describe('Asset', () => {
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
      it('doesn\'t allow content fields other than idData, and signature', () => {
        const brokenAsset = put(exampleAsset, 'content.metadata', 'abc');
        expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
      });
    });

    describe('Event', () => {
      for (const field of [
        'eventId',
        'content',
        'content.signature',
        'content.idData',
        'content.idData.assetId',
        'content.idData.createdBy',
        'content.idData.timestamp',
        'content.idData.dataHash',
        'content.idData.accessLevel',
        'content.data']) {
        // eslint-disable-next-line no-loop-func
        it(`throws if the ${field} field is missing`, () => {
          const brokenEvent = pick(exampleEvent, field);
          expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        });
      }

      it('throws ValidationError if event not passing event format validation', () => {
        const brokenEvent = put(exampleEvent, 'content.data.location', {latitude: 91});
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].dataPath', '.data.location.latitude');
      });

      it('throws ValidationError if event not passing custom entity validation', () => {
        const brokenEvent = put(exampleEvent, 'content.data.entries', [{type: 'com.ambrosus.scan'}]);
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].params.missingProperty', 'value');
      });      

      it('throws if accessLevel not positive integer', () => {
        let brokenEvent = put('content.idData.accessLevel', exampleEvent, 1.1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        brokenEvent = put('content.idData.accessLevel', exampleEvent, -1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
      });

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

      it('doesn\'t allow content fields other than data, idData and signature', () => {
        const brokenEvent = put(exampleEvent, 'content.metadata', 'abc');
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

  it('Generating stubs of events', () => {
    const entityBuilder = new EntityBuilder({});

    const ret = entityBuilder.stubForEvent(exampleEvent);

    expect(ret.content.data).to.be.undefined;
  });

  describe('Assembling a bundle', () => {
    let mockIdentityManager;
    let entityBuilder;
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
      entityBuilder = new EntityBuilder(mockIdentityManager);

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);

      inAssets = [
        await scenario.addAsset(0),
        await scenario.addAsset(0)
      ];
      inEvents = [
        await scenario.addEvent(0, 0),
        await scenario.addEvent(0, 1),
        await scenario.addEvent(0, 1)
      ];
      inTimestamp = getTimestamp();
      const stripFunc = (entry) => put(entry, 'mock.bundleStripped', 1);
      inAssetsStripped = inAssets.map(stripFunc);
      inEventsStripped = inEvents.map(stripFunc);
      const stubFunc = (entry) => put(entry, 'mock.stub', 1);
      inEventsStubbed = inEventsStripped.map(stubFunc);

      mockIdentityManager.addressFromSecret.returns(mockAddress);
      mockIdentityManager.calculateHash.onFirstCall().returns(mockHash1);
      mockIdentityManager.calculateHash.onSecondCall().returns(mockHash2);
      mockIdentityManager.sign.returns(mockSignature);
      sinon.stub(entityBuilder, 'removeBundle');
      sinon.stub(entityBuilder, 'stubForEvent');
      entityBuilder.removeBundle.callsFake(stripFunc);
      entityBuilder.stubForEvent.callsFake(stubFunc);

      ret = entityBuilder.assembleBundle(inAssets, inEvents, inTimestamp, inSecret);
    });

    after(() => {
      entityBuilder.removeBundle.restore();
      entityBuilder.stubForEvent.restore();
    });

    it('strips the bundleId metadata link using the removeBundle method', () => {
      expect(entityBuilder.removeBundle).to.have.callCount(inAssets.length + inEvents.length);
    });

    it('calculates event stubs', () => {
      expect(entityBuilder.stubForEvent).to.have.callCount(inEvents.length);
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

  describe('Validating query parameters', () => {
    let entityBuilder;
    const exampleAssetId = `0xbdaacf42a48710b97d115d521fdf01cdb9d8ba5e66d806cc45d1000231292ce7`;
    const validParamsAsStrings = {assetId: '0x1234', fromTimestamp: '10', toTimestamp: '20', page: '2', perPage: '4', createdBy: '0x4321', location: `asset(${exampleAssetId})`};

    before(() => {
      entityBuilder = new EntityBuilder({});
    });

    it('passes for proper parameters', () => {
      const params = {
        assetId: '0x1234', fromTimestamp: 10, toTimestamp: 20, page: 2, perPage: 4, createdBy: '0x4321',
        location: validParamsAsStrings.location
      };
      const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
      expect(validatedParams.assetId).to.equal('0x1234');
      expect(validatedParams.fromTimestamp).to.equal(10);
      expect(validatedParams.toTimestamp).to.equal(20);
      expect(validatedParams.page).to.equal(2);
      expect(validatedParams.perPage).to.equal(4);
      expect(validatedParams.createdBy).to.equal('0x4321');
      expect(validatedParams.locationAsAsset).to.equal(exampleAssetId);
    });

    it('casts strings on integers if needed', () => {
      const params = validParamsAsStrings;
      const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
      expect(validatedParams.assetId).to.equal('0x1234');
      expect(validatedParams.fromTimestamp).to.equal(10);
      expect(validatedParams.toTimestamp).to.equal(20);
      expect(validatedParams.page).to.equal(2);
      expect(validatedParams.perPage).to.equal(4);
      expect(validatedParams.createdBy).to.equal('0x4321');
      expect(validatedParams.locationAsAsset).to.equal(exampleAssetId);
    });

    describe('query with entry', () => {
      it('handles query by entry validation', () => {
        const params = {entry: {acceleration: '1'}};
        const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
        expect(validatedParams.entry.acceleration).to.equal('1');
      });

      it('handles query by entry validation with nested arguments', () => {
        const params = {entry: {'acceleration.valueX': '1'}};
        const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
        expect(validatedParams.entry['acceleration.valueX']).to.equal('1');
      });

      it('throws if unsupported by entry syntax (object)', () => {
        const params = put(validParamsAsStrings, 'entry[acceleration]', '{x: 1, y: 2}');
        expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
      });

      it('throws if unsupported by entry syntax (array)', () => {
        const params = put(validParamsAsStrings, 'entry[acceleration]', '[1, 2]');
        expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
      });
    });

    it('throws if surplus parameters are passed', () => {
      const params = put(validParamsAsStrings, 'additionalParam', '123');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    it('throws if surplus parameters are passed', () => {
      const params = put(validParamsAsStrings, 'additionalParam', '123');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    it('throws if fromTimestamp value not in valid type', () => {
      const params = put(validParamsAsStrings, 'fromTimestamp', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    it('throws if toTimestamp value not in valid type', () => {
      const params = put(validParamsAsStrings, 'toTimestamp', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    it('throws if page value not in valid type', () => {
      const params = put(validParamsAsStrings, 'page', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    it('throws if perPage value not in valid type', () => {
      const params = put(validParamsAsStrings, 'perPage', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(InvalidParametersError);
    });

    describe('parsing location query', () => {
      it('extracts assetId from query', async () => {
        expect(entityBuilder.parseLocationQuery(validParamsAsStrings.location))
          .to.deep.equal({locationAsAsset: exampleAssetId});
      });

      it('throws if invalid location search query', async () => {
        expect(() => entityBuilder.parseLocationQuery('wrongparam(0x0)', 1))
          .to.throw(InvalidParametersError);
      });

      it('throws if assetId has wrong format', async () => {
        expect(() => entityBuilder.parseLocationQuery('asset(0x0000)', 1))
          .to.throw(InvalidParametersError);
        expect(() => entityBuilder.parseLocationQuery(`asset(0x${'z'.repeat(64)}`, 1))
          .to.throw(InvalidParametersError);
        expect(() => entityBuilder.parseLocationQuery(`asset(${'0'.repeat(64)}`, 1))
          .to.throw(InvalidParametersError);
      });
    });
  });
});
