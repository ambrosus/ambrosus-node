/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {JsonValidationError} from '../../../src/errors/errors';
import EventEntryValidator from '../../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../../src/validators/json_schema_validator';
import identifiersAssetSchema from '../../../src/validators/schemas/custom/ambrosus.asset.identifiers.json';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});


describe(`Event Entry Validator - 'ambrosus.asset.identifiers'`, () => {
  const identifiersAssetValidator = new EventEntryValidator('ambrosus.asset.identifiers',
    new JsonSchemaValidator(identifiersAssetSchema));

  const expectValidationError = (brokenEntry, errorMessage) => {
    const event = createEventWithEntries([brokenEntry]);
    expect(() => identifiersAssetValidator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].message', errorMessage);
  };

  it('accepts valid entry', () => {
    const event = createEventWithEntries([
      {type: 'ambrosus.asset.identifiers', identifiers: {isbn: ['abc', 'cde'], VIN: ['000']}},
      {type: 'ambrosus.asset.identifiers', identifiers: {abc: ['abc']}}
    ]);
    expect(() => identifiersAssetValidator.validate(event)).to.not.throw();
  });

  it('throws when no "identifiers"', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers'};
    const errorMessage = `should have required property 'identifiers'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when additional properties', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: {abc: ['abc']}, extraField: 'superValue'};
    const errorMessage = `should NOT have additional properties`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when "identifiers" is not an object', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: 0};
    const errorMessage = `should be object`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when "identifiers" is an empty object', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: {}};
    const errorMessage = `should NOT have fewer than 1 properties`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier is not an array', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: {isbn: 0}};
    const errorMessage = 'should be array';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier is an empty array', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: {isbn: []}};
    const errorMessage = 'should NOT have fewer than 1 items';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier item is not a string', () => {
    const brokenEntry = {type: 'ambrosus.asset.identifiers', identifiers: {isbn: [0]}};
    const errorMessage = 'should be string';
    expectValidationError(brokenEntry, errorMessage);
  });
});
