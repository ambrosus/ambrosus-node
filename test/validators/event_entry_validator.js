import {JsonValidationError} from '../../src/errors/errors';
import EventEntryValidator from '../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../src/validators/json_schema_validator';
import identifiersSchema from '../../src/validators/schemas/custom/ambrosus.event.identifiers.json';
import locationSchema from '../../src/validators/schemas/custom/ambrosus.event.location.asset.json';
import locationGeoSchema from '../../src/validators/schemas/custom/ambrosus.event.location.geo.json';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});

describe('EventEntryValidator', () => {
  describe('ambrosus.event.identifiers', () => {
    let identifiersValidator;

    before(() => {
      identifiersValidator = new EventEntryValidator('ambrosus.event.identifiers',
        new JsonSchemaValidator(identifiersSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.identifiers', isbn: ['abc', 'cde'], VIN: ['000']},
        {type: 'ambrosus.event.identifiers', abc: ['abc']}
      ]);
      expect(() => identifiersValidator.validate(event)).to.not.throw();
    });

    it('throws when no identifiers', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers'}]);
      expect(() => identifiersValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 2 properties');
    });

    it('throws when invalid identifier is an empty array', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: []}]);
      expect(() => identifiersValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 1 items');
    });

    it('throws when invalid identifier is not an object', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: 0}]);
      expect(() => identifiersValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be array');
    });
  });

  describe('ambrosus.event.location.asset', () => {
    let locationValidator;

    before(() => {
      locationValidator = new EventEntryValidator('ambrosus.event.location.asset', new JsonSchemaValidator(locationSchema));
    });

    it('should accept if valid entry', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab625'}
      ]);
      expect(() => locationValidator.validate(event)).to.not.throw();
    });

    it('should throw if no asset provided', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.asset'}
      ]);
      expect(() => locationValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].params.missingProperty', 'asset');
    });

    it('should throw if assetId contains non-hex characters', async () => {
      const assetId = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6zz'}
      ]);
      expect(() => locationValidator.validate(assetId))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should match pattern "^0x[a-fA-F0-9]{64}$"');
    });

    it('should throw if assetId is too short', async () => {
      const assetId = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6'}
      ]);
      expect(() => locationValidator.validate(assetId))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should match pattern "^0x[a-fA-F0-9]{64}$"');
    });

    it('should throw if assetId is too long', async () => {
      const assetId = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6123'}
      ]);
      expect(() => locationValidator.validate(assetId))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should match pattern "^0x[a-fA-F0-9]{64}$"');
    });
  });

  describe('ambrosus.event.location.geo', () => {
    let locationGeoValidator;

    before(() => {
      locationGeoValidator = new EventEntryValidator('ambrosus.event.location.geo',
        new JsonSchemaValidator(locationGeoSchema));
    });

    it('should accept if valid entry', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: -100, latitude: 80}
      ]);
      expect(() => locationGeoValidator.validate(event)).to.not.throw();
    });

    it('should throw if no longitude', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: -100}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].params.missingProperty', 'latitude');
    });

    it('should throw if no latitude', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', latitude: 80}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].params.missingProperty', 'longitude');
    });

    it('should throw if longitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 181, latitude: 0}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 180');
    });

    it('should throw if longitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: -181, latitude: 0}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -180');
    });

    it('should throw if latitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 0, latitude: 91}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 90');
    });

    it('should throw if latitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 0, latitude: -91}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -90');
    });
  });
});
