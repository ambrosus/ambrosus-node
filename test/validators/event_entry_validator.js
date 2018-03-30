import {JsonValidationError} from '../../src/errors/errors';
import EventEntryValidator from '../../src/validators/event_entry_validator.js';
import JsonValidator from '../../src/validators/json_validator';
import deliveredSchema from '../../src/validators/schemas/custom/com.ambrosus.delivered.json';

import chai from 'chai';

const {expect} = chai;

const createEventWithEntries = (entries) => ({
  data: {
    identifier: {},
    entries
  }
});

describe('EventEntryValidator', () => {

  let validator;

  beforeEach(() => {
    validator = new EventEntryValidator('com.ambrosus.delivered', new JsonValidator(deliveredSchema));
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
    const event = createEventWithEntries([{
      type: 'com.ambrosus.scan'
    }]);
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('should accept if valid entry', () => {
    const event = createEventWithEntries([{
      type: 'com.ambrosus.delivered',
      confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]);
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('should accept if valid entry (multiple entries)', () => {
    const event = createEventWithEntries([{
      type: 'com.ambrosus.delivered',
      confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }, {
      type: 'com.ambrosus.scan',
      value: 'jhasghjadsghjads'
    }]);
    expect(() => validator.validate(event)).to.not.throw();
  });

  it('should throw JsonValidationError if invalid entry', () => {
    const event = createEventWithEntries([{
      type: 'com.ambrosus.delivered'
    }]);
    expect(() => validator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].params.missingProperty', 'confirmationAddress');
  });

  it('should throw JsonValidationError if invalid entry (multiple entries)', () => {
    const event = createEventWithEntries([{
      type: 'com.ambrosus.scan',
      value: 'jhasghjadsghjads'
    }, {
      type: 'com.ambrosus.delivered'
    }]);
    expect(() => validator.validate(event))
      .to.throw(JsonValidationError)
      .and.have.nested.property('errors[0].params.missingProperty', 'confirmationAddress');
  });
});
