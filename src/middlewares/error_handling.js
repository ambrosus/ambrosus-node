import {
  AuthenticationError,
  InvalidParametersError,
  NotFoundError,
  PermissionError,
  ValidationError
} from '../errors/errors';

export default (err, req, res, next) => {
  if (err instanceof InvalidParametersError || err instanceof ValidationError) {
    res.status(400).send({reason: err.message});
  } else if (err instanceof AuthenticationError) {
    res.status(401).send({reason: err.message});
  } else if (err instanceof PermissionError) {
    res.status(403).send({reason: err.message});
  } else if (err instanceof NotFoundError) {
    res.status(404).send({reason: err.message});
  } else {
    console.error(err);
    res.status(500).send({reason: err.message});
  }
  next();
};
