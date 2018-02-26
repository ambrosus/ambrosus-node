import {InvalidParametersError} from '../errors/errors';

const ambAuthorizationHeaderMiddleware = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    next();
    return;
  }

  const [type, secret] = authorizationHeader.split(' ');
  if (type !== 'AMB') {
    throw new InvalidParametersError(`Only Authorization type AMB is supported`);
  }
  req.ambSecret = secret;
  next();
};

export default ambAuthorizationHeaderMiddleware;

