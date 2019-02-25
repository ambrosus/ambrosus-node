/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {JsonValidationError} from '../../../src/errors/errors';
import EventEntryValidator from '../../../src/validators/event_entry_validator.js';
import JsonSchemaValidator from '../../../src/validators/json_schema_validator';
import infoAssetSchema from '../../../src/validators/schemas/custom/ambrosus.asset.info.json';
import {pick, put} from '../../../src/utils/dict_utils';
import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: entries
});


describe(`Event Entry Validator - 'ambrosus.asset.info'`, () => {
  const validEntry = {
    type: 'ambrosus.asset.info',
    assetType: 'ambrosus.assetTypes.item',
    name: 'Luxury Product Prima Sort',
    localisedName: {
      fo: 'oo',
      ba: 'ar'
    },
    description: 'The most luxury product ever made',
    localisedDescription: {
      fo: 'oo',
      ba: 'ar'
    },
    tags: ['foo', 'bar'],
    extraNumber: 9501101530003,
    extraString: 'FooBar',
    images: {
      default: {
        url: 'http://luxury.com/ourItem/default.jpg',
        size: {
          width: 1000,
          height: 1000
        }
      },
      secondary: {
        url: 'http://luxury.com/ourItem/secondary.jpg'
      }
    }
  };

  const infoAssetValidator = new EventEntryValidator('ambrosus.asset.info',
    new JsonSchemaValidator(infoAssetSchema));

  const expectValidationError = (brokenEntry, errorMessage) => {
    const event = createEventWithEntries([brokenEntry]);
    expect(() => infoAssetValidator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].message', errorMessage);
  };

  it('accepts valid entry', async () => {
    const event = createEventWithEntries([validEntry]);
    expect(() => infoAssetValidator.validate(event)).to.not.throw();
  });

  it('throws if "assetType" is not a string', async () => {
    const brokenEntry = put(validEntry, 'assetType', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "name" is missing', async () => {
    const brokenEntry = pick(validEntry, 'name');
    const errorMessage = `should have required property 'name'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "name" is not a string', async () => {
    const brokenEntry = put(validEntry, 'name', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "localisedName" is not an object', async () => {
    const brokenEntry = put(validEntry, 'localisedName', 0);
    const errorMessage = `should be object`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "localisedName" properties are not strings', async () => {
    const brokenEntry = put(validEntry, 'localisedName.field', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "description" is not a string', async () => {
    const brokenEntry = put(validEntry, 'description', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "localisedDescription" is not an object', async () => {
    const brokenEntry = put(validEntry, 'localisedDescription', 0);
    const errorMessage = `should be object`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "localisedDescription" properties are not strings', async () => {
    const brokenEntry = put(validEntry, 'localisedDescription.field', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "tags" is not an array', async () => {
    const brokenEntry = put(validEntry, 'tags', {});
    const errorMessage = `should be array`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "tags" items are not strings', async () => {
    const brokenEntry = put(validEntry, 'tags', [0, 1, 2]);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images" is not an object', async () => {
    const brokenEntry = put(validEntry, 'images', 0);
    const errorMessage = `should be object`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images" is an empty object', async () => {
    const brokenEntry = put(validEntry, 'images', {});
    const errorMessage = `should NOT have fewer than 1 properties`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images" property does not contain url', async () => {
    const brokenEntry = pick(validEntry, 'images.default.url');
    const errorMessage = `should have required property 'url'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images.url" is not string', async () => {
    const brokenEntry = put(validEntry, 'images.default.url', 0);
    const errorMessage = `should be string`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images.size" does not contain "width"', async () => {
    const brokenEntry = pick(validEntry, 'images.default.size.width');
    const errorMessage = `should have required property 'width'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images.size" does not contain "height"', async () => {
    const brokenEntry = pick(validEntry, 'images.default.size.height');
    const errorMessage = `should have required property 'height'`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images.size.width" is not a number', async () => {
    const brokenEntry = put(validEntry, 'images.default.size.width', 'sampleString');
    const errorMessage = `should be number`;
    expectValidationError(brokenEntry, errorMessage);
  });

  it('throws if "images.size.height" is not a number', async () => {
    const brokenEntry = put(validEntry, 'images.default.size.height', 'sampleString');
    const errorMessage = `should be number`;
    expectValidationError(brokenEntry, errorMessage);
  });
});
