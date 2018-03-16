import https from 'https';
import {NotFoundError, PermissionError, ValidationError, AuthenticationError} from '../errors/errors';
export default class HttpsClient {
  async performHTTPSGet(requestOptions) {
    return new Promise((resolve, reject) => {
      try {
        https.get(requestOptions, (res) => {
          resolve({body : res.body, statusCode : res.statusCode});
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  validateIncomingStatusCode(statusCode) {
    switch (statusCode) {
      case 200:
        return;
      case 400:
        throw new ValidationError();
      case 401:
        throw new AuthenticationError();
      case 403:
        throw new PermissionError();
      case 404:
        throw new NotFoundError();
      default:
        throw new Error();
    }
  }
}
