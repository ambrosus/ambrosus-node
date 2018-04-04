import {InvalidParametersError, AuthenticationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

const accessTokenMiddleware = (tokenAuthenticator, required = true) => ((req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    if (required) {
      throw new AuthenticationError('Authorization AMB_TOKEN header not found');
    } else {
      next();
      return;
    }
  }

  const [type, token] = authorizationHeader.split(' ');
  if (type !== 'AMB_TOKEN') {
    if (required) {
      throw new InvalidParametersError(`Expected Authorization type AMB_TOKEN`);
    } else {
      next();
      return;
    }
  }

  const {idData} = tokenAuthenticator.decodeToken(token, getTimestamp());
  req.tokenData = idData;
  next();
});

export default accessTokenMiddleware;

