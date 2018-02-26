import {InvalidParametersError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const presignerMiddleware = (identityManager, toSignPath = 'content.idData', signaturePath = 'content.signature') => ((req, res, next) => {
  const {secret} = req;
  if (!secret) {
    next();
    return;
  }

  const toSign = get(req.body, toSignPath);
  if (typeof toSign === 'undefined') {
    throw new InvalidParametersError(`No content found at ${toSignPath}`);
  }

  const signature = identityManager.sign(secret, toSign);
  req.body = put(req.body, signaturePath, signature);
  delete req.secret;
  next();
});

export default presignerMiddleware;

