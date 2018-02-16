import {InvalidParametersError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const prehasherMiddleware = (identityManager, toHashPath = 'content', hashPath = 'id') => ((req, res, next) => {
  const toHash = get(req.body, toHashPath);
  if (toHash === undefined) {
    throw new InvalidParametersError(`No content found at ${toHashPath}`);
  }

  const hash = identityManager.calculateHash(toHash);
  req.body = put(req.body, hashPath, hash);
  next();
});

export default prehasherMiddleware;

