/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {aesDecrypt, atomicSleep, networkRequest} from '../utils/private_key';

class PrivateKeyRetriever {
  private retrieveAttempts = 10;
  private serviceUrl = 'http://172.18.0.2:3000';
  private minimalPKLength = 50;

  async getNonce(): Promise<{nonce: string, uuid: string}> {
    const {resBody} = await networkRequest('GET', `${this.serviceUrl}/nonce`);
    const resBodyParsed = JSON.parse(resBody);
    const {nonce, uuid} = resBodyParsed;
    return {nonce, uuid};
  }

  async getPK(uuid: string): Promise<string> {
    const {resBody} = await networkRequest('POST', `${this.serviceUrl}/secret/${uuid}`);
    return JSON.parse(resBody).secret;
  }

  async retrieve(): Promise<string> {
    while (this.retrieveAttempts > 0) {
      try {
        const {nonce, uuid} = await this.getNonce();
        const secret = await this.getPK(uuid);
        const nonceBuffer = Buffer.from(String(nonce), 'base64');
        const pkEncrypted = Buffer.from(String(secret), 'base64');
        const pk = aesDecrypt(pkEncrypted, nonceBuffer);
        // check privateKey length
        if (pk.length > this.minimalPKLength) {
          return pk;
        }
      } catch (err) {
        console.log(`Unable to retrieve private key`, err);
      }
      this.retrieveAttempts--; // decrease attempts
      await atomicSleep();
    }
    return '';
  }
}

export default new PrivateKeyRetriever();
