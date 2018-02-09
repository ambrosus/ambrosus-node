import {InvalidParametersError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const presignerMiddleware = (identityManager, toSignPath = 'content.idData', signaturePath = 'content.signature') => ((req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    next();
    return;
  }

  const [type, secret] = authorizationHeader.split(' ');
  if (type !== 'AMB') {
    throw new InvalidParametersError(`Only Authorization type AMB is supported`);
  }

  const toSign = get(req.body, toSignPath);
  if (typeof toSign === 'undefined') {
    throw new InvalidParametersError(`No content found at ${toSignPath}`);
  }

  const signature = identityManager.sign(secret, toSign);
  req.body = put(req.body, signaturePath, signature);
  next();
});

export default presignerMiddleware;

