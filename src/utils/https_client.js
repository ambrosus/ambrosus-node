/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import https from 'https';
import http from 'http';
import URL from 'url';
import {NotFoundError, PermissionError, ValidationError, AuthenticationError} from '../errors/errors';

const DEFAULT_TIMEOUT = 300000;

export default class HttpsClient {
  async performHTTPSGet(uri, path, defaultOptions = {timeout: DEFAULT_TIMEOUT}) {
    const {agent, options} = this.prepareRequest(uri, path, defaultOptions);
    return new Promise((resolve, reject) => {
      try {
        const clientRequest = agent.get(options, (response) => {
          let rawData = '';
          let parsedData;
          response.on('data', (chunk) => rawData += chunk);
          response.on('end', () => {
            try {
              parsedData = JSON.parse(rawData);
            } catch (error) {
              reject(error);
            }
            resolve({body: parsedData, statusCode: response.statusCode});
          });
          response.on('error', reject);
        });
        this.handleRequestErrors(clientRequest, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async openHTTPSGetStream(uri, path, defaultOptions = {timeout: DEFAULT_TIMEOUT}) {
    const {agent, options} = this.prepareRequest(uri, path, defaultOptions);
    return new Promise((resolve, reject) => {
      try {
        const clientRequest = agent.get(options, (response) => {
          resolve({response, statusCode: response.statusCode});
        });
        this.handleRequestErrors(clientRequest, reject);
      } catch (error) {
        reject({error});
      }
    });
  }

  handleRequestErrors(clientRequest, reject) {
    clientRequest.on('error', reject)
      .on('timeout', () => {
        clientRequest.abort();
        reject('Request timed out');
      });
  }

  prepareRequest(uri, path, defaultOptions) {
    const {protocol, hostname, port} = URL.parse(uri);
    const agent = this.getAgentFromProtocol(protocol);
    const options = {
      ...defaultOptions,
      hostname,
      path,
      port
    };
    return {agent, options};
  }

  getAgentFromProtocol(protocol) {
    if (protocol.startsWith('https')) {
      return https;
    } else if (protocol.startsWith('http')) {
      return http;
    }
    throw Error(`Invalid protocol ${protocol}`);
  }

  validateIncomingStatusCode(statusCode, url) {
    const errorMsg = `Received code ${statusCode} at ${url}`;
    switch (statusCode) {
      case 200:
        return;
      case 400:
        throw new ValidationError(errorMsg);
      case 401:
        throw new AuthenticationError(errorMsg);
      case 403:
        throw new PermissionError(errorMsg);
      case 404:
        throw new NotFoundError(errorMsg);
      default:
        throw new Error(errorMsg);
    }
  }
}
