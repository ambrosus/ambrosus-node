/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export class AmbrosusError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AmbrosusError {
  constructor(message) {
    super(`Invalid data: ${message}`);
  }
}

export class AuthenticationError extends AmbrosusError {
  constructor(message) {
    super(`Authentication failed: ${message}`);
  }
}

export class PermissionError extends AmbrosusError {
  constructor(message) {
    super(`Permission denied: ${message}`);
  }
}

export class NotFoundError extends AmbrosusError {
  constructor(message) {
    super(`Not found: ${message}`);
  }
}

export class JsonValidationError extends ValidationError {
  constructor(errors) {
    const messageForError = (err) => {
      if (err.dataPath) {
        return `${err.dataPath} ${err.message}`;
      }
      return err.message;
    };
    super(errors.map((err) => messageForError(err)).join(', '));
    this.errors = errors;
  }
}
