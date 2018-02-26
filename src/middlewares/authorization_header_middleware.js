import {InvalidParametersError} from '../errors/errors';

const authorizationHeaderMiddleware = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    next();
    return;
  }

  const [type, secret] = authorizationHeader.split(' ');
  if (type !== 'AMB') {
    throw new InvalidParametersError(`Only Authorization type AMB is supported`);
  }
  req.secret = secret;
  next();
};

export default authorizationHeaderMiddleware;

