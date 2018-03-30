import Validator from './validator';
import {JsonValidationError} from '../errors/errors';
import Ajv from 'ajv';


export default class JsonValidator extends Validator {
  constructor(schema, ajv = new Ajv()) {
    super();
    this.schema = schema;
    this.ajv = ajv;
  }

  isValid(data) {
    return this.ajv.validate(this.schema, data);
  }
  
  validate(data) {    
    if (!this.isValid(data)) {
      throw new JsonValidationError(this.ajv.errors);
    }
  }
}
