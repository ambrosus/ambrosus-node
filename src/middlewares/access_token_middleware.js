import {InvalidParametersError, AuthenticationError} from '../errors/errors';

const accessTokenMiddleware = (tokenAuthenticator) => ((req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    throw new AuthenticationError('Authorization AMB_TOKEN header not found');
  }

  const [type, token] = authorizationHeader.split(' ');
  if (type !== 'AMB_TOKEN') {
    throw new InvalidParametersError(`Expected Authorization type AMB_TOKEN`);
  }

  const {idData} = tokenAuthenticator.decodeToken(token, Date.now());  
  req.tokenData = idData;
  next();
});

export default accessTokenMiddleware;

