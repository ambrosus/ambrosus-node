/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import {JsonValidationError, ValidationError} from '../../src/errors/errors';

import IdentityManager from '../../src/services/identity_manager';
import EntityBuilder from '../../src/services/entity_builder';

import {adminAccountWithSecret} from '../fixtures/account';
import {createFullAsset, createFullEvent} from '../fixtures/assets_events';

import ScenarioBuilder from '../fixtures/scenario_builder';
import {getTimestamp} from '../../src/utils/time_utils';

chai.use(sinonChai);
const {expect} = chai;
const oneDayInSeconds = 60 * 60 * 24;

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
    let mockEnsureTimestampWithinLimit;

    before(() => {
      mockIdentityManager = {
        validateSignature: sinon.stub()
      };
      entityBuilder = new EntityBuilder(mockIdentityManager, oneDayInSeconds);
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

      it('checks if timestamp does not exceed limit', () => {
        mockEnsureTimestampWithinLimit = sinon.stub(entityBuilder, 'ensureTimestampWithinLimit');
        mockEnsureTimestampWithinLimit.throws(new ValidationError('Timestamp exceedes limit'));

        expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
        expect(mockEnsureTimestampWithinLimit).to.have.been.calledOnce;

        mockEnsureTimestampWithinLimit.restore();
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

      it('validates all predefined data types', async () => {
        const dataTypes = [
          'ambrosus.event.identifiers',
          'ambrosus.event.location.asset',
          'ambrosus.event.location.geo',
          'ambrosus.asset.location.geo'];
        expect(entityBuilder.eventValidators
          .map((validator) => validator.type)
          .filter((type) => type !== undefined)
          .sort())
          .to.deep.equal(dataTypes.sort());
      });

      it('throws ValidationError if event not passing event format validation', () => {
        const brokenEvent = put(exampleEvent, 'content.data',
          [...exampleEvent.content.data, {}]);
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].message', `should have required property 'type'`);
      });

      it('throws ValidationError if event not passing custom entity validation', () => {
        const brokenEvent = put(exampleEvent, 'content.data',
          [...exampleEvent.content.data, {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50]}}]);
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].dataPath', '.geoJson.coordinates');
      });

      it('throws if timestamp is not a positive integer', () => {
        let brokenEvent = put('content.idData.timestamp', exampleEvent, '1');
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        brokenEvent = put('content.idData.timestamp', exampleEvent, 1.1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        brokenEvent = put('content.idData.timestamp', exampleEvent, -1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        expect(() => entityBuilder.validateEvent(exampleEvent)).not.to.throw;
      });

      it('throws if accessLevel is not a positive integer', () => {
        let brokenEvent = put('content.idData.accessLevel', exampleEvent, 1.1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        brokenEvent = put('content.idData.accessLevel', exampleEvent, 1.1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        brokenEvent = put('content.idData.accessLevel', exampleEvent, -1);
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
        expect(() => entityBuilder.validateEvent(exampleEvent)).not.to.throw;
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

      it('checks if timestamp does not exceed limit', () => {
        mockEnsureTimestampWithinLimit = sinon.stub(entityBuilder, 'ensureTimestampWithinLimit');
        mockEnsureTimestampWithinLimit.throws(new ValidationError('Timestamp exceedes limit'));

        expect(() => entityBuilder.validateEvent(exampleEvent)).to.throw(ValidationError);
        expect(mockEnsureTimestampWithinLimit).to.have.been.calledOnce;

        mockEnsureTimestampWithinLimit.restore();
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
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
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

  describe('Manipulating timestamp in metadata', () => {
    let entityBuilder;
    let clock;

    before(() => {
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
      clock = sinon.useFakeTimers(5000);
    });

    it('adding entity upload timestamp works', () => {
      const eventWithBundle = entityBuilder.setEntityUploadTimestamp(exampleEvent);
      expect(eventWithBundle.metadata.entityUploadTimestamp).to.equal(5);
    });

    after(() => {
      clock.restore();
    });
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
      entityBuilder = new EntityBuilder(mockIdentityManager, oneDayInSeconds);

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
      sinon.stub(entityBuilder, 'removeBundle');
      sinon.stub(entityBuilder, 'prepareEventForBundlePublication');
      entityBuilder.removeBundle.callsFake(stripFunc);
      entityBuilder.prepareEventForBundlePublication.callsFake(prepFunc);

      ret = entityBuilder.assembleBundle(inAssets, inEvents, inTimestamp, inSecret);
    });

    after(() => {
      entityBuilder.removeBundle.restore();
      entityBuilder.prepareEventForBundlePublication.restore();
    });

    it('strips the bundleId metadata link using the removeBundle method', () => {
      expect(entityBuilder.removeBundle).to.have.callCount(inAssets.length + inEvents.length);
    });

    it('calculates event stubs', () => {
      expect(entityBuilder.prepareEventForBundlePublication).to.have.callCount(inEvents.length);
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

    describe('preparing events for bundle publication', () => {
      before(() => {
        entityBuilder.prepareEventForBundlePublication.restore();
      });

      it('removes data if access level is greater than 0', () => {
        const ret = entityBuilder.prepareEventForBundlePublication(scenario.events[2]);
        expect(ret.content.data).to.be.undefined;
      });

      it('keeps data if access level equals 0', () => {
        const ret = entityBuilder.prepareEventForBundlePublication(scenario.events[1]);
        expect(ret.content).to.have.property('data');
      });

      after(() => {
        sinon.stub(entityBuilder, 'prepareEventForBundlePublication');
      });
    });
  });

  describe('Validating query parameters - Asset', () => {
    let entityBuilder;
    const anAddress = '0xEaE0D78450DaB377376206f419E9bCA0D28829F9';
    const validParamsAsStrings = {
      createdBy: anAddress
    };

    before(() => {
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
    });

    it('passes for proper parameters', () => {
      const params = {
        createdBy: anAddress
      };
      const validatedParams = entityBuilder.validateAndCastFindAssetsParams(params);
      expect(validatedParams.createdBy).to.equal(anAddress);
    });

    it('throws if createdBy is not valid address', async () => {
      const params = put(validParamsAsStrings, 'createdBy', '0x12312312');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });
  });

  describe('Validating query parameters - Event', () => {
    let entityBuilder;
    const anAddress = '0xEaE0D78450DaB377376206f419E9bCA0D28829F9';
    const validParamsAsStrings = {
      assetId: '0x1234', fromTimestamp: '10', toTimestamp: '20', page: '2', perPage: '4',
      createdBy: anAddress
    };

    before(() => {
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
    });

    it('passes for proper parameters', () => {
      const params = {
        assetId: '0x1234', fromTimestamp: 10, toTimestamp: 20, page: 2, perPage: 4, createdBy: anAddress
      };
      const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
      expect(validatedParams.assetId).to.equal('0x1234');
      expect(validatedParams.fromTimestamp).to.equal(10);
      expect(validatedParams.toTimestamp).to.equal(20);
      expect(validatedParams.page).to.equal(2);
      expect(validatedParams.perPage).to.equal(4);
      expect(validatedParams.createdBy).to.equal(anAddress);
    });

    it('casts strings on integers if needed', () => {
      const params = validParamsAsStrings;
      const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
      expect(validatedParams.assetId).to.equal('0x1234');
      expect(validatedParams.fromTimestamp).to.equal(10);
      expect(validatedParams.toTimestamp).to.equal(20);
      expect(validatedParams.page).to.equal(2);
      expect(validatedParams.perPage).to.equal(4);
      expect(validatedParams.createdBy).to.equal(anAddress);
    });

    describe('query with entry', () => {
      it('handles query by entry validation', () => {
        const params = {data: {acceleration: '1'}};
        const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
        expect(validatedParams.data.acceleration).to.equal('1');
      });

      it('handles query by entry validation with nested arguments', () => {
        const params = {data: {'acceleration.valueX': '1'}};
        const validatedParams = entityBuilder.validateAndCastFindEventsParams(params);
        expect(validatedParams.data['acceleration.valueX']).to.equal('1');
      });

      it('throws if unsupported by entry syntax (object)', () => {
        const params = put(validParamsAsStrings, 'data[acceleration]', '{x: 1, y: 2}');
        expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      });

      it('throws if unsupported by entry syntax (array)', () => {
        const params = put(validParamsAsStrings, 'data[acceleration]', '[1, 2]');
        expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      });

      it('throws if geo data stored in field other than geoJson', () => {
        const params = {data: {someField: {locationLongitude : 2, locationLatitude : 10, locationMaxDistance : 15}}};
        expect(() => entityBuilder.ensureGeoLocationParamsCorrectlyPlaced(params)).to.throw(ValidationError);
      });

      it('throws if geoJson field contains non geographical data', () => {
        const params = {data: {geoJson: '1'}};
        expect(() => entityBuilder.ensureGeoLocationParamsCorrectlyPlaced(params)).to.throw(ValidationError);
      });

      it('throws if createdBy is not valid address', async () => {
        const params = put(validParamsAsStrings, 'createdBy', '0x12312312');
        expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      });
    });

    it('throws if surplus parameters are passed', () => {
      const params = put(validParamsAsStrings, 'additionalParam', '123');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if fromTimestamp value not in valid type', () => {
      const params = put(validParamsAsStrings, 'fromTimestamp', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if toTimestamp value not in valid type', () => {
      const params = put(validParamsAsStrings, 'toTimestamp', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if page value not in valid type', () => {
      const params = put(validParamsAsStrings, 'page', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if perPage value not in valid type', () => {
      const params = put(validParamsAsStrings, 'perPage', 'NaN');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });
  });

  describe('Validating timestamp', () => {
    let clock;
    let entityBuilder;
    let timestamp;

    before(() => {
      clock = sinon.useFakeTimers();
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
    });

    it('passes if timestamp is in the limit', () => {
      timestamp = 0;
      expect(() => entityBuilder.ensureTimestampWithinLimit(timestamp)).not.to.throw(ValidationError);
    });

    it('throws if timestamp exceedes the limit', () => {
      timestamp = oneDayInSeconds + 1;
      expect(() => entityBuilder.ensureTimestampWithinLimit(timestamp)).to.throw(ValidationError);
    });

    after(() => {
      clock.restore();
    });
  });
});
