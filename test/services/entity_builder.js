/*
Copyright: Ambrosus Inc.
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

import {createFullAsset, createFullEvent} from '../fixtures/assets_events';

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
        validateSignature: sinon.stub(),
        checkHashMatches: sinon.stub()
      };
      entityBuilder = new EntityBuilder(mockIdentityManager, oneDayInSeconds);
    });

    beforeEach(() => {
      mockIdentityManager.validateSignature.reset();
      mockIdentityManager.validateSignature.returns();
      mockIdentityManager.checkHashMatches.reset();
      mockIdentityManager.checkHashMatches.returns(true);
    });

    describe('Asset', () => {
      it('passes for proper asset', () => {
        expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw();
      });

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

      it('checks if assetId matches the hash of content (delegated to IdentityManager)', () => {
        mockIdentityManager.checkHashMatches.returns(false);
        expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
        expect(mockIdentityManager.checkHashMatches).to.have.been.calledOnce;
      });

      it('checks if signature is correct (delegated to IdentityManager)', () => {
        expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw();
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      it('checks if signature is incorrect (delegated to IdentityManager)', () => {
        mockIdentityManager.validateSignature.throws(new ValidationError('Signature is invalid'));

        expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
        expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
      });

      ['1', 1.1, -1].forEach((wrongTimestamp) => {
        it(`throws for timestamp not a positive integer: ${wrongTimestamp}`, () => {
          const brokenAsset = put(exampleAsset, 'content.idData.timestamp', wrongTimestamp);
          expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError, /timestamp.*Should be a non-negative integer/);
        });
      });

      it('does not throw when timestamp = 0', () => {
        expect(() => entityBuilder.validateAsset(put(exampleAsset, 'content.idData.timestamp', 0))).to.not.throw();
      });

      it('checks if timestamp does not exceed limit', () => {
        mockEnsureTimestampWithinLimit = sinon.stub(entityBuilder, 'isTimestampWithinLimit');
        mockEnsureTimestampWithinLimit.throws(new ValidationError('Timestamp exceeds limit'));

        expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
        expect(mockEnsureTimestampWithinLimit).to.have.been.calledOnce;

        mockEnsureTimestampWithinLimit.restore();
      });

      ['1', 1.1, -1].forEach((wrongSequenceNumber) => {
        it(`throws for sequenceNumber not a positive integer: ${wrongSequenceNumber}`, () => {
          const brokenAsset = put(exampleAsset, 'content.idData.sequenceNumber', wrongSequenceNumber);
          expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError, /sequenceNumber.*Should be a non-negative integer/);
        });
      });

      it(`doesn't allow root-level fields other than content and assetId`, () => {
        const brokenAsset = put(exampleAsset, 'metadata', 'abc');
        expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
      });

      it(`doesn't allow content fields other than idData, and signature`, () => {
        const brokenAsset = put(exampleAsset, 'content.metadata', 'abc');
        expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
      });

      it(`doesn't allow content.idData fields other than 'createdBy', 'timestamp' and 'sequenceNumber'`, () => {
        const brokenAsset = put(exampleAsset, 'content.idData.unexpectedField', 'abc');
        expect(() => entityBuilder.validateAsset(brokenAsset)).to.throw(ValidationError);
      });
    });

    describe('Event', () => {
      it('passes for proper event', () => {
        expect(() => entityBuilder.validateEvent(exampleEvent)).to.not.throw();
      });

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
          'ambrosus.asset.identifiers',
          'ambrosus.event.identifiers',
          'ambrosus.asset.location',
          'ambrosus.event.location',
          'ambrosus.asset.info'];
        expect(entityBuilder.eventValidators
          .map((validator) => validator.type)
          .filter((type) => type !== undefined)
          .sort())
          .to.deep.equal(dataTypes.sort());
      });

      it('checks if eventId is the hash of content (delegated to IdentityManager)', () => {
        mockIdentityManager.checkHashMatches.withArgs(exampleEvent.eventId, exampleEvent.content).returns(false);
        expect(() => entityBuilder.validateEvent(exampleEvent)).to.throw(ValidationError);
        expect(mockIdentityManager.checkHashMatches).to.have.been.calledWith(exampleEvent.eventId, exampleEvent.content);
      });

      it('checks if dataHash matches the hash of data (delegated to IdentityManager)', () => {
        mockIdentityManager.checkHashMatches.withArgs(exampleEvent.content.idData.dataHash, exampleEvent.content.data).returns(false);
        expect(() => entityBuilder.validateEvent(exampleEvent)).to.throw(ValidationError);
        expect(mockIdentityManager.checkHashMatches).to.have.been.calledWith(exampleEvent.content.idData.dataHash, exampleEvent.content.data);
      });

      it('throws ValidationError if event not passing event format validation', () => {
        const brokenEvent = put(
          exampleEvent,
          'content.data',
          [...exampleEvent.content.data, {}]
        );
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].message', `should have required property 'type'`);
      });

      it('throws ValidationError if event not passing custom entity validation', () => {
        const brokenEvent = put(
          exampleEvent,
          'content.data',
          [...exampleEvent.content.data, {type: 'ambrosus.event.location', geoJson: {type: 'Point', coordinates: [50]}}]
        );
        expect(() => entityBuilder.validateEvent(brokenEvent))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].dataPath', '.geoJson.coordinates');
      });

      it('throws ValidationError if event exceeds the 10KB size limit', () => {
        const longString = new Array(10 * 1024)
          .fill('0')
          .join('');
        const oversizeEvent = put(
          exampleEvent,
          'content.data',
          [{type: 'some.type', longString}]
        );
        expect(() => entityBuilder.validateEvent(oversizeEvent)).to.throw(ValidationError);
      });

      ['1', 1.1, -1].forEach((wrongTimestamp) => {
        it(`throws for timestamp not a positive integer: ${wrongTimestamp}`, () => {
          const brokenEvent = put(exampleEvent, 'content.idData.timestamp', wrongTimestamp);
          expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError, /timestamp.*Should be a non-negative integer/);
        });
      });

      ['1', 1.1, -1].forEach((wrongAccessLevel) => {
        it(`throws for accessLevel not a positive integer: ${wrongAccessLevel}`, () => {
          const brokenEvent = put(exampleEvent, 'content.idData.accessLevel', wrongAccessLevel);
          expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError, /accessLevel.*Should be a non-negative integer/);
        });
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
        mockEnsureTimestampWithinLimit = sinon.stub(entityBuilder, 'isTimestampWithinLimit');
        mockEnsureTimestampWithinLimit.throws(new ValidationError('Timestamp exceeds limit'));

        expect(() => entityBuilder.validateEvent(exampleEvent)).to.throw(ValidationError);
        expect(mockEnsureTimestampWithinLimit).to.have.been.calledOnce;

        mockEnsureTimestampWithinLimit.restore();
      });

      it(`doesn't allow root-level fields other than content, and eventId`, () => {
        const brokenEvent = put(exampleEvent, 'metadata', 'abc');
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
      });

      it(`doesn't allow content fields other than data, idData and signature`, () => {
        const brokenEvent = put(exampleEvent, 'content.metadata', 'abc');
        expect(() => entityBuilder.validateEvent(brokenEvent)).to.throw(ValidationError);
      });

      it(`doesn't allow content.idData fields other than 'assetId', 'createdBy', 'timestamp', 'dataHash', 'accessLevel'`, () => {
        const brokenEvent = put(exampleEvent, 'content.idData.unexpectedField', 'abc');
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

  describe('preparing events for bundle publication', () => {
    let entityBuilder;

    before(() => {
      entityBuilder = new EntityBuilder({}, oneDayInSeconds);
    });

    it('removes data if access level is greater than 0', () => {
      const highAccessLevelEvent = put(exampleEvent, 'content.idData.accessLevel', 2);
      const ret = entityBuilder.prepareEventForBundlePublication(highAccessLevelEvent);
      expect(ret.content.data).to.be.undefined;
    });

    it('keeps data if access level equals 0', () => {
      const ret = entityBuilder.prepareEventForBundlePublication(exampleEvent);
      expect(ret.content).to.have.property('data');
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

    it('passes and casts when passed correct parameters', () => {
      const params = {
        createdBy: anAddress,
        page: '2',
        perPage: '100',
        fromTimestamp: '15000000000',
        toTimestamp: '17000000000'
      };
      const validatedParams = entityBuilder.validateAndCastFindAssetsParams(params);
      expect(validatedParams).to.deep.equal({
        createdBy: anAddress,
        page: 2,
        perPage: 100,
        fromTimestamp: 15000000000,
        toTimestamp: 17000000000
      });
    });

    it('throws if createdBy is not valid address', async () => {
      const params = put(validParamsAsStrings, 'createdBy', '0x12312312');
      expect(() => entityBuilder.validateAndCastFindAssetsParams(params)).to.throw(ValidationError);
    });

    ['avc', '1.3', '-10'].forEach((wrongPage) => {
      it(`throws for page not a positive integer: ${wrongPage}`, () => {
        expect(() => entityBuilder.validateAndCastFindAssetsParams({page: wrongPage})).to.throw(ValidationError);
      });
    });

    ['avc', '1.3', '-10', '0'].forEach((wrongPage) => {
      it(`throws for perPage not a positive integer: ${wrongPage}`, () => {
        expect(() => entityBuilder.validateAndCastFindAssetsParams({perPage: wrongPage})).to.throw(ValidationError);
      });
    });

    it('throws if perPage is greater than 100', async () => {
      expect(() => entityBuilder.validateAndCastFindAssetsParams({perPage: '101'})).to.throw(ValidationError);
    });

    ['avc', '1.3', '-10'].forEach((wrongTimestamp) => {
      it(`throws for fromTimestamp not a positive integer: ${wrongTimestamp}`, () => {
        expect(() => entityBuilder.validateAndCastFindAssetsParams({fromTimestamp: wrongTimestamp})).to.throw(ValidationError);
      });
    });

    ['avc', '1.3', '-10'].forEach((wrongTimestamp) => {
      it(`throws for toTimestamp not a positive integer: ${wrongTimestamp}`, () => {
        expect(() => entityBuilder.validateAndCastFindAssetsParams({toTimestamp: wrongTimestamp})).to.throw(ValidationError);
      });
    });
  });

  describe('Validating query parameters - Event', () => {
    let entityBuilder;
    const anAddress = '0xEaE0D78450DaB377376206f419E9bCA0D28829F9';
    const validParamsAsStrings = {
      assetId: '0x1234', fromTimestamp: '10', toTimestamp: '20', page: '2', perPage: '100',
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
      expect(validatedParams.perPage).to.equal(100);
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
        const params = {data: {someField: {locationLongitude: 2, locationLatitude: 10, locationMaxDistance: 15}}};
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

    it('throws if fromTimestamp value is float or negative', () => {
      let params = put(validParamsAsStrings, 'fromTimestamp', '1.1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      params = put(validParamsAsStrings, 'fromTimestamp', '-1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if toTimestamp value is float or negative', () => {
      let params = put(validParamsAsStrings, 'toTimestamp', '1.1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      params = put(validParamsAsStrings, 'toTimestamp', '-1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    it('throws if page value is float or negative', () => {
      let params = put(validParamsAsStrings, 'page', '1.1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
      params = put(validParamsAsStrings, 'page', '-1');
      expect(() => entityBuilder.validateAndCastFindEventsParams(params)).to.throw(ValidationError);
    });

    ['abc', '1.3', '-1', '0', '101'].forEach((wrongPage) => {
      it(`throws for perPage value being float or not positive or greater then 100: ${wrongPage}`, () => {
        expect(() => entityBuilder.validateAndCastFindAssetsParams({perPage: wrongPage})).to.throw(ValidationError);
      });
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

    it('returns true if timestamp is in the limit', () => {
      timestamp = 0;
      expect(entityBuilder.isTimestampWithinLimit(timestamp)).to.be.true;
    });

    it('returns false if timestamp exceeds the limit', () => {
      timestamp = oneDayInSeconds + 1;
      expect(entityBuilder.isTimestampWithinLimit(timestamp)).to.be.false;
    });

    after(() => {
      clock.restore();
    });
  });
});
