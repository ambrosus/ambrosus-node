/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createWeb3, deployContract, getDefaultAddress} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

async function deployBundleRegistry() {
  const web3 = await createWeb3();
  console.log(`Deploying bundle registry contract from address: ${getDefaultAddress(web3)}`);
  return deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode);
}

deployBundleRegistry()
  .then((contract) => {
    console.log(`Bundle registry has been deployed at: ${contract.options.address}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
