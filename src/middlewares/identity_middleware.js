import {ValidationError, PermissionError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

export default (identityManager, ownerPath, toSignPath, signaturePath) => ({
  sign: (req, res, next) => {
    const secret = req.params.Authorisation;
    if (!secret) {
      next();
    } else {
      const toSign = get(req.body, toSignPath);
      if (typeof toSign === 'undefined') {
        throw new ValidationError(`No content found at ${toSignPath}`);
      }
      const signature = identityManager.sign(secret, toSign);
      req.body = put(req.body, signaturePath, signature);
      next();
    }
  },
  validateSignature: (req, res, next) => {
    const ownerAddress = get(req.body, ownerPath);
    if (typeof ownerAddress !== 'string') {
      throw new ValidationError(`No address found at ${ownerPath}`);
    }
    const signature = get(req.body, signaturePath);
    if (typeof signature !== 'string') {
      throw new ValidationError(`No signature found at ${signaturePath}`);
    }
    const toSign = get(req.body, toSignPath);
    if (typeof toSign === 'undefined') {
      throw new ValidationError(`No content found at ${toSignPath}`);
    }
    if (!identityManager.validateSignature(ownerAddress, signature, toSign)) {
      throw new PermissionError(`Data was not signed by ${ownerAddress} or was modified`);
    }
    next();
  }
});

