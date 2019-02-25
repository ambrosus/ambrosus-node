/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Validator from './validator';
import {JsonValidationError} from '../errors/errors';
import Ajv from 'ajv';

export default class JsonSchemaValidator extends Validator {
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
