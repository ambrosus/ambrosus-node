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

    before(() => {
      validator = new JsonSchemaValidator(eventsSchema);
    });

    it('accepts a valid event', () => {
      const event = {data: {
        entries: [{}],
        identifiers: {
          foo: ['bar']
        },
        location: {
          latitude: 0,
          longitude: 0
        }
      }};
      expect(() => validator.validate(event)).to.not.throw();
    });

    describe('data', () => {
      it('throws JsonValidationError when no entries specified', () => {
        const event = {data: {}};
        expect(() => validator.validate(event))
          .to.throw(JsonValidationError)
          .and.have.nested.property('errors[0].params.missingProperty', 'entries');
      });

      it('throws if not expected properties in data', async () => {
        const event = {data: {foo: 1}};
        expect(() => validator.validate(event)).to.throw(JsonValidationError);
      });

      it('throws when invalid identifiers', async () => {
        const emptyIdents = {
          data: {
            entries: [{}],
            identifiers: {}
          }
        };
        const emptyIdentsArray = {
          data: {
            entries: [{}],
            identifiers: {foo: []}
          }
        };
        const wrongIdentsType = {
          data: {
            entries: [{}],
            identifiers: {foo: 0}
          }
        };

        expect(() => validator.validate(emptyIdents)).to.throw(JsonValidationError);
        expect(() => validator.validate(emptyIdentsArray)).to.throw(JsonValidationError);
        expect(() => validator.validate(wrongIdentsType)).to.throw(JsonValidationError);
      });

      it('throws when invalid entries', async () => {
        const emptyEntries = {
          data: {
            entries: []
          }
        };
        const wrongEntryType = {
          data: {
            entries: [0]
          }
        };

        expect(() => validator.validate(emptyEntries)).to.throw(JsonValidationError);
        expect(() => validator.validate(wrongEntryType)).to.throw(JsonValidationError);
      });

      it('accepts asset as location', async () => {
        const event = {data: {
          entries: [{}],
          location: {
            asset: '0x1'
          }
        }};
        expect(() => validator.validate(event)).to.not.throw();
      });

      it('throws when mixed lon-lat and asset', async () => {
        const mixedGeoAndAsset = {
          data: {
            entries: [{}],
            location: {
              latitude: 0,
              longitude: 0,
              asset: ''
            }
          }
        };

        expect(() => validator.validate(mixedGeoAndAsset)).to.throw(JsonValidationError);
      });

      it('throws when bad lon-lat format', async () => {
        const noLat = {
          data: {
            entries: [{}],
            location: {
              longitude: 0
            }
          }
        };
        const noLon = {
          data: {
            entries: [{}],
            location: {
              latitude: 0
            }
          }
        };

        expect(() => validator.validate(noLat)).to.throw(JsonValidationError);
        expect(() => validator.validate(noLon)).to.throw(JsonValidationError);
      });

      it('throws if wrong lon-lat values', async () => {
        const event = {
          data: {
            entries: [{}],
            location: {
              latitude: 0,
              longitude: 1000
            }
          }
        };

        expect(() => validator.validate(event)).to.throw(JsonValidationError);
      });
    });
  });
});
