import {InvalidParametersError, PermissionError} from '../errors/errors';

const ambAuthorizationHeaderMiddleware = (config) => (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    next();
    return;
  }

  if (!config.isAuthorizationWithSecretKeyEnabled()) {
    throw new PermissionError('Authorization by secret key is not possible');
  }
  const [type, secret] = authorizationHeader.split(' ');
  if (type !== 'AMB') {
    throw new InvalidParametersError(`Only Authorization type AMB is supported`);
  }
  req.ambSecret = secret;
  next();
};

export default ambAuthorizationHeaderMiddleware;

