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

export class PermissionError extends AmbrosusError {
  constructor(message) {
    super(`Permision denied: ${message}`);
  }
}

export class NotFoundError extends AmbrosusError {
  constructor(message) {
    super(`Entity not found: ${message}`);
  }
}
