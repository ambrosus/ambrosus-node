/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {loadContract, deployContract} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

export default class ContractManager {
  static loadBundleRegistryContract(web3, bundleRegistryContractAddress) {
    let result;
    if (bundleRegistryContractAddress) {
      result = loadContract(web3, BundleRegistry.abi, bundleRegistryContractAddress);
    } else {
      throw new Error('bundle proof registry contract address is not configured');
    }
    return result;
  }

  static async deploy(web3) {
    const contract = await deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode);
    return contract.options.address;
  }
}
