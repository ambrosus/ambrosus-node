/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {JsonValidationError} from '../../../src/errors/errors';
import EventEntryValidator from '../../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../../src/validators/json_schema_validator';
import identifiersEventSchema from '../../../src/validators/schemas/custom/ambrosus.event.identifiers.json';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});


describe(`Event Entry Validator - 'ambrosus.event.identifiers'`, () => {
  const identifiersEventValidator = new EventEntryValidator('ambrosus.event.identifiers',
    new JsonSchemaValidator(identifiersEventSchema));

  const expectValidationError = (brokenEntry, errorMessage) => {
    const event = createEventWithEntries([brokenEntry]);
    expect(() => identifiersEventValidator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].message', errorMessage);
  };

  it('accepts valid entry', () => {
    const event = createEventWithEntries([
      {type: 'ambrosus.event.identifiers', identifiers: {isbn: ['abc', 'cde'], VIN: ['000']}},
      {type: 'ambrosus.event.identifiers', identifiers: {abc: ['abc']}}
    ]);
    expect(() => identifiersEventValidator.validate(event)).to.not.throw();
  });

  it('throws when no "identifiers"', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers'};
    const errorMessage = `should have required property 'identifiers'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when additional properties', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: {abc: ['abc']}, extraField: 'superValue'};
    const errorMessage = `should NOT have additional properties`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when "identifiers" field is not an object', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: 0};
    const errorMessage = `should be object`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when "identifiers" field is an empty object', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: {}};
    const errorMessage = `should NOT have fewer than 1 properties`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier is an empty array', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: {isbn: []}};
    const errorMessage = 'should NOT have fewer than 1 items';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier is not an object', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: {isbn: 0}};
    const errorMessage = 'should be array';
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws when identifier item is not a string', () => {
    const brokenEntry = {type: 'ambrosus.event.identifiers', identifiers: {isbn: [0]}};
    const errorMessage = 'should be string';
    expectValidationError(brokenEntry, errorMessage);
  });
});
