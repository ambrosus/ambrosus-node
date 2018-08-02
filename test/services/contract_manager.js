/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ContractManager from '../../src/services/contract_manager';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import {contractsJsons, serviceContractsJsons} from '../../src/utils/contracts_consts';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Contract Manager', () => {
  let web3;
  let head;
  let context;
  let contractManager;
  const deployedMockContracts = {};

  const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');
  const generateAddress = () => web3.eth.accounts.create().address;

  before(async () => {
    web3 = await createWeb3();
    head = await deployContract(web3, serviceContractsJsons.head.abi, serviceContractsJsons.head.bytecode);

    for (const contractName in contractsJsons) {
      deployedMockContracts[contractName] = generateAddress();
    }

    const contextConstructorParams = getContractConstructor(serviceContractsJsons.context)
      .inputs
      .map((input) => input.name.slice(1));

    const addressesForContextConstructor = contextConstructorParams.map((key) => deployedMockContracts[key]);

    context = await deployContract(web3, serviceContractsJsons.context.abi, serviceContractsJsons.context.bytecode, addressesForContextConstructor);
    await head.methods.setContext(context.options.address).send({
      from: getDefaultAddress(web3)
    });

    contractManager = new ContractManager(web3, head.options.address);
  });

  it('does not allow to get nonexistent contract address', async () => {
    await expect(contractManager.contractAddressFromContext('fakeContract')).to.be.eventually.rejectedWith(Error);
  });

  it('does not allow to get internal contract address', async () => {
    await expect(contractManager.contractAddressFromContext('bundleStore')).to.be.eventually.rejectedWith(Error);
  });

  describe('Gets contracts', () => {
    it('kycWhitelist', async () => {
      expect((await contractManager.kycWhitelistContract()).options.address).to.equal(deployedMockContracts.kycWhitelist);
    });

    it('roles', async () => {
      expect((await contractManager.rolesContract()).options.address).to.equal(deployedMockContracts.roles);
    });

    it('fees', async () => {
      expect((await contractManager.feesContract()).options.address).to.equal(deployedMockContracts.fees);
    });

    it('challenges', async () => {
      expect((await contractManager.challengesContract()).options.address).to.equal(deployedMockContracts.challenges);
    });

    it('payouts', async () => {
      expect((await contractManager.payoutsContract()).options.address).to.equal(deployedMockContracts.payouts);
    });

    it('shelteringTransfers', async () => {
      expect((await contractManager.shelteringTransfersContract()).options.address).to.equal(deployedMockContracts.shelteringTransfers);
    });

    it('uploads', async () => {
      expect((await contractManager.uploadsContract()).options.address).to.equal(deployedMockContracts.uploads);
    });
  });
});
