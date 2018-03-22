import https from 'https';
import http from 'http';
import URL from 'url';

import {NotFoundError, PermissionError, ValidationError, AuthenticationError} from '../errors/errors';
export default class HttpsClient {
  async performHTTPSGet(uri, path) {    
    const {protocol, hostname, port} = URL.parse(uri);
    const agent = this.getAgentFromProtocol(protocol);        
    const options = {
      hostname,
      path,
      port
    };
    return new Promise((resolve, reject) => {
      try {
        agent.get(options, (res) => {
          let rawData = '';
          res.on('data', (chunk) => rawData += chunk);
          res.on('end', () => {
            const parsedData = JSON.parse(rawData);
            resolve({body: parsedData, statusCode: res.statusCode});
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getAgentFromProtocol(protocol) {
    if (protocol.startsWith('https')) {
      return https;
    } else if (protocol.startsWith('http')) {
      return http;
    } 
    throw Error(`Invalid protocol ${protocol}`);       
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
