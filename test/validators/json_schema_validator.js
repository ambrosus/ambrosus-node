import {JsonValidationError} from '../../src/errors/errors';
import JsonSchemaValidator from '../../src/validators/json_schema_validator';
import eventsSchema from '../../src/validators/schemas/event';
import chai from 'chai';


const {expect} = chai;

describe('JsonSchemaValidator', () => {
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

  it('throw JsonValidationError with informative message if validation fails', () => {
    const validator = new JsonSchemaValidator(schema);
    expect(() => validator.validate(dataWithMissingField))
      .to.throw(JsonValidationError)
      .and.have.property('message', `Invalid data: should have required property 'aRequiredString'`);
  });

  it('accepts a valid event', () => {
    const validator = new JsonSchemaValidator(eventsSchema);
    const event = {identifiers: {}};
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('throws JsonValidationError on invalid event', () => {
    const validator = new JsonSchemaValidator(eventsSchema);
    const event = {data: {}};
    expect(() => validator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].params.missingProperty', 'entries');
  });
});
