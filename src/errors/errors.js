export class AmbrosusError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidParametersError extends AmbrosusError {
  constructor(message) {
    super(`Invalid parameter: ${message}`);
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
    super(`Entity not found: ${message}`);
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
