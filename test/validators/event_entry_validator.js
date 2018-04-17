import {JsonValidationError} from '../../src/errors/errors';
import EventEntryValidator from '../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../src/validators/json_schema_validator';
import deliveredSchema from '../../src/validators/schemas/custom/ambrosus.event.delivered.json';
import identifiersSchema from '../../src/validators/schemas/custom/ambrosus.event.identifiers.json';
import locationSchema from '../../src/validators/schemas/custom/ambrosus.event.location.asset.json';
import locationGeoSchema from '../../src/validators/schemas/custom/ambrosus.event.location.geo.json';
import scanSchema from '../../src/validators/schemas/custom/ambrosus.event.scan.json';

import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});

describe('EventEntryValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new EventEntryValidator('ambrosus.event.delivered', new JsonSchemaValidator(deliveredSchema));
  });

  it('should accept if entries are null', () => {
    const event = createEventWithEntries(null);
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('should accept if entries empty', () => {
    const event = createEventWithEntries([]);
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('should accept if given types not present', () => {
    const event = createEventWithEntries([
      {
        type: 'ambrosus.event.scan'
      }]);
    expect(() => validator.validate(event)).to.not.throw();
  });

  describe('ambrosus.event.delivered', () => {
    let deliverValidator;

    before(() => {
      deliverValidator = new EventEntryValidator('ambrosus.event.delivered', new JsonSchemaValidator(deliveredSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([
        {
          type: 'ambrosus.event.delivered',
          confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
          confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
        }]);
      expect(() => deliverValidator.validate(event)).to.not.throw();
    });

    it('should accept if valid entry (multiple entries)', () => {
      const event = createEventWithEntries([
        {
          type: 'ambrosus.event.delivered',
          confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
          confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
        }, {
          type: 'ambrosus.event.scan',
          value: 'jhasghjadsghjads'
        }]);
      expect(() => deliverValidator.validate(event)).to.not.throw();
    });

    it('should throw JsonValidationError if invalid entry', () => {
      const event = createEventWithEntries([
        {
          type: 'ambrosus.event.delivered'
        }]);
      expect(() => deliverValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].params.missingProperty', 'confirmationAddress');
    });

    it('should throw JsonValidationError if invalid entry (multiple entries)', () => {
      const event = createEventWithEntries([
        {
          type: 'ambrosus.event.scan',
          value: 'jhasghjadsghjads'
        }, {
          type: 'ambrosus.event.delivered'
        }]);
      expect(() => deliverValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].params.missingProperty', 'confirmationAddress');
    });
  });

  describe('ambrosus.event.scan', () => {
    let scanValidator;

    before(() => {
      scanValidator = new EventEntryValidator('ambrosus.event.scan', new JsonSchemaValidator(scanSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.scan', value: '1'}]);
      expect(() => scanValidator.validate(event)).to.not.throw();
    });

    it('should throw if no value', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.scan'}]);
      expect(() => scanValidator.validate(event))
        .to.throw(JsonValidationError);
    });

    it('should throw if no value not string', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.scan', value: 12}]);
      expect(() => scanValidator.validate(event))
        .to.throw(JsonValidationError);
    });
  });

  describe('ambrosus.event.identifiers', () => {
    let identValidator;

    before(() => {
      identValidator = new EventEntryValidator('ambrosus.event.identifiers',
        new JsonSchemaValidator(identifiersSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.identifiers', isbn: ['abc', 'cde'], VIN: ['000']},
        {type: 'ambrosus.event.identifiers', abc: ['abc']}
      ]);
      expect(() => identValidator.validate(event)).to.not.throw();
    });

    it('throws when invalid identifiers', () => {
      const emptyIdents = createEventWithEntries([{type: 'ambrosus.event.identifiers'}]);
      const emptyIdentsArray = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: []}]);
      const wrongIdentsType = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: 0}]);

      expect(() => identValidator.validate(emptyIdents)).to.throw(JsonValidationError);
      expect(() => identValidator.validate(emptyIdentsArray)).to.throw(JsonValidationError);
      expect(() => identValidator.validate(wrongIdentsType)).to.throw(JsonValidationError);
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
      expect(() => locationValidator.validate(event)).to.throw(JsonValidationError);
    });

    it('should throw if no asset format does not match', async () => {
      const nonHexCharacters = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6zz'}
      ]);
      const toShort = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6'}
      ]);
      const toLong = createEventWithEntries([
        {type: 'ambrosus.event.location.asset', asset: '0x63d31688ddb1b82b57d4bc1c58a0761d6f3cde0fe2a936d4b9d1403c6f6ab6123'}
      ]);

      expect(() => locationValidator.validate(nonHexCharacters)).to.throw(JsonValidationError);
      expect(() => locationValidator.validate(toShort)).to.throw(JsonValidationError);
      expect(() => locationValidator.validate(toLong)).to.throw(JsonValidationError);
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

    it('should throw if no long/lat', async () => {
      const noLong = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', latitude: 80}
      ]);
      const noLat = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: -100}
      ]);

      expect(() => locationGeoValidator.validate(noLong)).to.throw(JsonValidationError);
      expect(() => locationGeoValidator.validate(noLat)).to.throw(JsonValidationError);
    });

    it('should throw if lon/lat overflow', async () => {
      const lonToBig = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 181, latitude: 0}
      ]);
      const lonToSmall = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: -181, latitude: 0}
      ]);
      const latToBig = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 0, latitude: 91}
      ]);
      const latToSmall = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', longitude: 0, latitude: -91}
      ]);

      expect(() => locationGeoValidator.validate(lonToBig)).to.throw(JsonValidationError);
      expect(() => locationGeoValidator.validate(lonToSmall)).to.throw(JsonValidationError);
      expect(() => locationGeoValidator.validate(latToBig)).to.throw(JsonValidationError);
      expect(() => locationGeoValidator.validate(latToSmall)).to.throw(JsonValidationError);
    });
  });
});
