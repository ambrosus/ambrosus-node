/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BundleRegistryJson from '../../build/contracts/BundleRegistry.json';
import {deployContract} from '../../src/utils/web3_tools';


const deployContracts = async (web3) => {
  const bundleRegistry = await deployContract(web3, BundleRegistryJson.abi, BundleRegistryJson.bytecode);
  return {bundleRegistry};
};

export default deployContracts;
