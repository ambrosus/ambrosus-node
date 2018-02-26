import {InvalidParametersError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const presignerMiddleware = (identityManager, toSignPath = 'content.idData', signaturePath = 'content.signature') => ((req, res, next) => {
  const {ambSecret} = req;
  if (!ambSecret) {
    next();
    return;
  }

  const toSign = get(req.body, toSignPath);
  if (typeof toSign === 'undefined') {
    throw new InvalidParametersError(`No content found at ${toSignPath}`);
  }

  const signature = identityManager.sign(ambSecret, toSign);
  req.body = put(req.body, signaturePath, signature);
  next();
});

export default presignerMiddleware;

