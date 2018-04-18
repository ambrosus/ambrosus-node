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

  describe('events', () => {
    let validator;
    const validEvent = {
      data: [{type: '1', foo: 'bar'}, {type: '2'}]
    };

    before(() => {
      validator = new JsonSchemaValidator(eventsSchema);
    });

    it('accepts a valid event', () => {
      expect(() => validator.validate(validEvent)).to.not.throw();
    });

    describe('data', () => {
      it('throws JsonValidationError when data is not an array', async () => {
        expect(() => validator.validate({data: {}}))
          .to.throw(JsonValidationError)
          .with.nested.property('errors[0].message', 'should be array');
      });

      it('throws JsonValidationError when empty data', () => {
        expect(() => validator.validate({data: []}))
          .to.throw(JsonValidationError)
          .with.nested.property('errors[0].message', 'should NOT have less than 1 items');
      });

      it('throws JsonValidationError when some entry in data is not object', async () => {
        const event = {data: [...validEvent.data, '']};
        expect(() => validator.validate(event)).to.throw(JsonValidationError);
      });

      it('throws JsonValidationError when some entry in data has no type', async () => {
        const event = {data: [...validEvent.data, {ab: 1}]};
        expect(() => validator.validate(event)).to.throw(JsonValidationError);
      });
    });
  });
});
