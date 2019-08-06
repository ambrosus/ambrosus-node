/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class OperationalMode {
  constructor(operationalModeRepository, tokenAuthenticator) {
    this.operationalModeRepository = operationalModeRepository;
    this.tokenAuthenticator = tokenAuthenticator;
    this.modeInfo = null;
  }

  async setMode(request) {
    if (request.mode !== undefined) {
      const mode = this.tokenAuthenticator.decode(request.mode);
      this.retireMode = mode.idData.mode === 'retire';
      if (this.retireMode) {
        this.operationalModeRepository.set({mode:'retire'});
      } else {
        this.operationalModeRepository.set({mode:'normal'});
      }
    }
  }

  setModeInfo(modeInfo) {
    this.modeInfo = modeInfo;
  }

  getModeInfo() {
    return this.modeInfo;
  }

  async isRetire() {
    if (this.retireMode === undefined) {
      const mode = await this.operationalModeRepository.get();
      if (null !== mode) {
        this.retireMode = mode.mode === 'retire';
      }
    }
    return this.retireMode;
  }
}

