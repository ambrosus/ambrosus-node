export class AmbrosusError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AmbrosusError {
  constructor(message) {
    super(`Validation Failed: ${message}`);
  }
}

export class DataFormatError extends AmbrosusError {
  constructor(message) {
    super(`Wrong data format: ${message}`);
  }
}

export class NotFoundError extends AmbrosusError {}

export class MissingParametersError extends AmbrosusError {}

export class PermissionError extends AmbrosusError {
  constructor(message) {
    super(`Permision denied: ${message}`);
  }
}
