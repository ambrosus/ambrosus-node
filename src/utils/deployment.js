/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// import {deployContract, link} from '../../src/utils/web3_tools';
import {contractJsons} from '../utils/contracts_consts';
import Deployer from './deployer';


const deployAll = async (web3, privateKey, logger) => {
  const deployingAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(deployingAccount);

  const deployer = new Deployer(web3, deployingAccount.address);

  const params = {
    head: {
      owner: deployingAccount.address
    },
    validatorSet: {
      owner: deployingAccount.address,
      initialValidators : [],
      superUser: deployingAccount.address
    },
    blockRewards: {
      owner: deployingAccount.address,
      baseReward: '2000000000000000000',
      superUser: deployingAccount.address
    }
  };

  const {head} = await deployer.deploy(contractJsons, {}, [], params);

  logger.info({message: 'Contracts successfully deployed', head: head.options.address});

  return head;
};

export default deployAll;
