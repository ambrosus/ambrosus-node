/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ErrorObject as AjvError} from 'ajv';

export class AmbrosusError extends Error {
  public constructor(message) {
    super(message);
    Object.setPrototypeOf(this, AmbrosusError.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AmbrosusError {
  public constructor(message) {
    super(`Invalid data: ${message}`);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AmbrosusError {
  public constructor(message) {
    super(`Authentication failed: ${message}`);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class PermissionError extends AmbrosusError {
  public constructor(message) {
    super(`Permission denied: ${message}`);
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

export class NotFoundError extends AmbrosusError {
  public constructor(message) {
    super(`Not found: ${message}`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class JsonValidationError extends ValidationError {
  public errors: AjvError[];

  public constructor(errors: AjvError[]) {
    const messageForError = (err: AjvError): string => {
      if (err.dataPath) {
        return `${err.dataPath} ${err.message}`;
      }
      return err.message || '';
    };
    super(errors.map((err) => messageForError(err)).join(', '));
    Object.setPrototypeOf(this, JsonValidationError.prototype);
    this.errors = errors;
  }
}
