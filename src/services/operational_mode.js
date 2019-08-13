/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import OperationalModes from '../utils/operational_modes';

export default class OperationalMode {
  constructor(operationalModeRepository, tokenAuthenticator) {
    this.operationalModeRepository = operationalModeRepository;
    this.tokenAuthenticator = tokenAuthenticator;
  }

  async set(request) {
    if (request.mode !== undefined) {
      const mode = this.tokenAuthenticator.decode(request.mode);
      if (mode.idData.mode === OperationalModes.retire) {
        this.operationalModeRepository.set({mode:OperationalModes.retire, info:{}});
      } else {
        this.operationalModeRepository.set({mode:OperationalModes.normal, info:{}});
      }
    }
  }

  async setInfo(info) {
    await this.operationalModeRepository.updateInfo(info);
  }

  async get() {
    const mode = await this.operationalModeRepository.get();
    return (mode === null) ? {mode:OperationalModes.normal} : mode;
  }

  async isRetire() {
    const mode = await this.operationalModeRepository.get();
    return (null !== mode) && (mode.mode === OperationalModes.retire);
  }
}

