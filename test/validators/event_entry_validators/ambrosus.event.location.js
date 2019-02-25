/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {JsonValidationError} from '../../../src/errors/errors';
import EventEntryValidator from '../../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../../src/validators/json_schema_validator';
import locationEventSchema from '../../../src/validators/schemas/custom/ambrosus.event.location.json';
import {pick, put} from '../../../src/utils/dict_utils';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});


describe(`Event Entry Validator - 'ambrosus.event.location'`, () => {
  const validEntry = {
    type: 'ambrosus.event.location',
    geoJson: {
      type: 'Point',
      coordinates: [13, -15]
    },
    assetId: '0x39d59c8c1cdefb95f4df15fd4f43bce842a761e189e11bedcc1d54f3b0459c21',
    name: 'Huxley Building, Imperial College London',
    city: 'London',
    country: 'UK',
    locationId: '809c578721b74cae1d56504594819285',
    GLN: 9501101530003
  };

  const locationEventValidator = new EventEntryValidator('ambrosus.event.location',
    new JsonSchemaValidator(locationEventSchema));

  const expectValidationError = (brokenEntry, errorMessage) => {
    const event = createEventWithEntries([brokenEntry]);
    expect(() => locationEventValidator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].message', errorMessage);
  };

  it('accepts valid entry', async () => {
    const event = createEventWithEntries([validEntry]);
    expect(() => locationEventValidator.validate(event)).to.not.throw();
  });

  it('throws if provided invalid assetId', async () => {
    const brokenEntry = put(validEntry, 'assetId', '0x39d59c8c1cdefb95f4df15fd4f43bce842a761e189e11bedcc1d54zzzzzzzzzz');
    const errorMessage = 'should match pattern "^0x[a-fA-F0-9]{64}$"';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "name" is not a string', async () => {
    const brokenEntry = put(validEntry, 'name', 0);
    const errorMessage = 'should be string';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "country" is not a string', async () => {
    const brokenEntry = put(validEntry, 'country', 0);
    const errorMessage = 'should be string';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "city" is not a string', async () => {
    const brokenEntry = put(validEntry, 'city', 0);
    const errorMessage = 'should be string';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if missing coordinate', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [0]);
    const errorMessage = 'should NOT have fewer than 2 items';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if surplus coordinate', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [0, 0, 0]);
    const errorMessage = 'should NOT have more than 2 items';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if longitude is too big', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [500, 0]);
    const errorMessage = 'should be <= 180';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if longitude is too small', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [-500, 0]);
    const errorMessage = 'should be >= -180';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if latitude is too big', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [0, 500]);
    const errorMessage = 'should be <= 90';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if latitude is too small', async () => {
    const brokenEntry = put(validEntry, 'geoJson.coordinates', [0, -500]);
    const errorMessage = 'should be >= -90';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "geoJson" contains extra fields', async () => {
    const brokenEntry = put(validEntry, 'geoJson.extraField', 'superValue');
    const errorMessage = 'should NOT have additional properties';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "geoJson.type" is not Point', async () => {
    const brokenEntry = put(validEntry, 'geoJson.type', 'totallyNotAPoint');
    const errorMessage = 'should be equal to constant';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if missing "geoJson.type"', async () => {
    const brokenEntry = pick(validEntry, 'geoJson.type');
    const errorMessage = `should have required property 'type'`;
    expectValidationError(brokenEntry, errorMessage);
  });
});
