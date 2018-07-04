/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {JsonValidationError} from '../../src/errors/errors';
import EventEntryValidator from '../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../src/validators/json_schema_validator';
import identifiersEventSchema from '../../src/validators/schemas/custom/ambrosus.event.identifiers.json';
import identifiersAssetSchema from '../../src/validators/schemas/custom/ambrosus.asset.identifiers.json';
import locationSchema from '../../src/validators/schemas/custom/ambrosus.event.location.asset.json';
import locationEventGeoSchema from '../../src/validators/schemas/custom/ambrosus.event.location.geo.json';
import locationAssetGeoSchema from '../../src/validators/schemas/custom/ambrosus.asset.location.geo.json';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});

describe('EventEntryValidator', () => {
  describe('ambrosus.event.identifiers', () => {
    let identifiersEventValidator;

    before(() => {
      identifiersEventValidator = new EventEntryValidator('ambrosus.event.identifiers',
        new JsonSchemaValidator(identifiersEventSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.identifiers', isbn: ['abc', 'cde'], VIN: ['000']},
        {type: 'ambrosus.event.identifiers', abc: ['abc']}
      ]);
      expect(() => identifiersEventValidator.validate(event)).to.not.throw();
    });

    it('throws when no identifiers', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers'}]);
      expect(() => identifiersEventValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 2 properties');
    });

    it('throws when invalid identifier is an empty array', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: []}]);
      expect(() => identifiersEventValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 1 items');
    });

    it('throws when invalid identifier is not an object', () => {
      const event = createEventWithEntries([{type: 'ambrosus.event.identifiers', foo: 0}]);
      expect(() => identifiersEventValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be array');
    });
  });

  describe('ambrosus.asset.identifiers', () => {
    let identifiersAssetValidator;

    before(() => {
      identifiersAssetValidator = new EventEntryValidator('ambrosus.asset.identifiers',
        new JsonSchemaValidator(identifiersAssetSchema));
    });

    it('should accept if valid entry', () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.identifiers', isbn: ['abc', 'cde'], VIN: ['000']},
        {type: 'ambrosus.asset.identifiers', abc: ['abc']}
      ]);
      expect(() => identifiersAssetValidator.validate(event)).to.not.throw();
    });

    it('throws when no identifiers', () => {
      const event = createEventWithEntries([{type: 'ambrosus.asset.identifiers'}]);
      expect(() => identifiersAssetValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 2 properties');
    });

    it('throws when invalid identifier is an empty array', () => {
      const event = createEventWithEntries([{type: 'ambrosus.asset.identifiers', foo: []}]);
      expect(() => identifiersAssetValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 1 items');
    });

    it('throws when invalid identifier is not an object', () => {
      const event = createEventWithEntries([{type: 'ambrosus.asset.identifiers', foo: 0}]);
      expect(() => identifiersAssetValidator.validate(event))
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
        new JsonSchemaValidator(locationEventGeoSchema));
    });

    it('should accept if valid entry', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event)).to.not.throw();
    });

    it('should throw if missing coordinate', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 2 items');
    });

    it('should throw if surplus coordinate', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50, 50, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have more than 2 items');
    });

    it('should throw if longitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [500, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 180');
    });

    it('should throw if longitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [-500, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -180');
    });

    it('should throw if latitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50, 100]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 90');
    });

    it('should throw if latitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.event.location.geo', geoJson : {type : 'Point', coordinates : [50, -100]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -90');
    });
  });

  describe('ambrosus.asset.location.geo', () => {
    let locationGeoValidator;

    before(() => {
      locationGeoValidator = new EventEntryValidator('ambrosus.asset.location.geo',
        new JsonSchemaValidator(locationAssetGeoSchema));
    });

    it('should accept if valid entry', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [50, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event)).to.not.throw();
    });

    it('should throw if missing coordinate', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have less than 2 items');
    });

    it('should throw if surplus coordinate', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [50, 50, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should NOT have more than 2 items');
    });

    it('should throw if longitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [500, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 180');
    });

    it('should throw if longitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [-500, 50]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -180');
    });

    it('should throw if latitude too big', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [50, 100]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be <= 90');
    });

    it('should throw if latitude too small', async () => {
      const event = createEventWithEntries([
        {type: 'ambrosus.asset.location.geo', geoJson : {type : 'Point', coordinates : [50, -100]}}
      ]);
      expect(() => locationGeoValidator.validate(event))
        .to.throw(JsonValidationError)
        .and.have.nested.property('errors[0].message', 'should be >= -90');
    });
  });
});
