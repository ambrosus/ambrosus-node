import {JsonValidationError} from '../../src/errors/errors';
import JsonValidator from '../../src/utils/json_validator';
import eventsSchema from '../../src/schemas/eventsData';
import chai from 'chai';


const {expect} = chai;

describe('JsonValidator', () => {
  const schema = {
    title: 'Person',
    type: 'object',
    properties: {
      aRequiredString: {
        type: 'string'
      }

    },
    required: ['aRequiredString']
  };

  const dataWithMissingField = {
  };

  let validator;

  before(() => {
    validator = new JsonValidator();
  });

  it('throw ValidationError with informative message if validation fails', () => {
    expect(() => validator.validate(dataWithMissingField, schema))
      .to.throw(JsonValidationError)
      .and.have.property('message', `Invalid data: should have required property 'aRequiredString'`);
  });

  it('accepts a valid event', () => {
    const event = {identifiers: []};
    expect(() => validator.validate(event, eventsSchema)).to.not.throw();
  });

  it('throws on invalid event', () => {
    const event = {};
    expect(() => validator.validate(event, eventsSchema))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].params.missingProperty', 'identifiers');
  });
});
