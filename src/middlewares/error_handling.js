import {PermissionError, ValidationError} from '../errors/errors';

export default (err, req, res, next) => {
  if (err instanceof ValidationError) {
    res.status(400).send({reason: err.message});
  } else if (err instanceof PermissionError) {
    res.status(401).send({reason: err.message});
  } else {
    res.status(500).send({reason: err.message});
  }
  next();
};
