import {JsonValidationError} from '../errors/errors';
import Ajv from 'ajv';


export default class JsonValidator {
  constructor(ajv = new Ajv()) {
    this.ajv = ajv;
  }

  validate(data, schema) {
    const valid = this.ajv.validate(schema, data);
    if (!valid) {
      throw new JsonValidationError(this.ajv.errors);
    }
  }
}
