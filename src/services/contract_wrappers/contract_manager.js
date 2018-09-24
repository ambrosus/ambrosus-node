/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import RolesWrapper from './roles_wrapper';
import ConfigWrapper from './config_wrapper';
import UploadsWrapper from './uploads_wrapper';
import FeesWrapper from './fees_wrapper';
import ChallengesWrapper from './challenges_wrapper';
import ShelteringWrapper from './sheltering_wrapper';
import KycWhitelistWrapper from './kyc_whitelist_wrapper';
import HeadWrapper from './head_wrapper';

export default class ContractManager {
  constructor(web3, headContractAddress, defaultAddress) {
    this.headWrapper = new HeadWrapper(headContractAddress, web3, defaultAddress);
    this.rolesWrapper = new RolesWrapper(this.headWrapper, web3, defaultAddress);
    this.configWrapper = new ConfigWrapper(this.headWrapper, web3, defaultAddress);
    this.uploadsWrapper = new UploadsWrapper(this.headWrapper, web3, defaultAddress);
    this.feesWrapper = new FeesWrapper(this.headWrapper, web3, defaultAddress);
    this.challengesWrapper = new ChallengesWrapper(this.headWrapper, web3, defaultAddress);
    this.shelteringWrapper = new ShelteringWrapper(this.headWrapper, web3, defaultAddress);
    this.kycWhitelistWrapper = new KycWhitelistWrapper(this.headWrapper, web3, defaultAddress);
  }
}
