/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract, getDefaultAddress} from '../../../src/utils/web3_tools';
import {contractJsons} from '../../../src/utils/contracts_consts';
import HeadWrapper from '../../../src/services/contract_wrappers/head_wrapper';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Head Wrapper', () => {
  let web3;
  let ownerAddress;
  let head;
  let context;
  let catalogue;
  let headWrapper;
  const deployedMockContracts = {};

  const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');
  const generateAddress = () => web3.eth.accounts.create().address;

  before(async () => {
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    head = await deployContract(web3, contractJsons.head, [ownerAddress]);

    const catalogueConstructorParams = getContractConstructor(contractJsons.catalogue)
      .inputs
      .map((input) => input.name.slice(1));

    for (const paramName of catalogueConstructorParams) {
      deployedMockContracts[paramName] = generateAddress();
    }

    const addressesForCatalogueConstructor = catalogueConstructorParams.map((paramName) => deployedMockContracts[paramName]);

    catalogue = await deployContract(web3, contractJsons.catalogue, addressesForCatalogueConstructor);
    context = await deployContract(web3, contractJsons.context, [addressesForCatalogueConstructor, catalogue.options.address]);
    await head.methods.setContext(context.options.address).send({
      from: ownerAddress
    });

    headWrapper = new HeadWrapper(head.options.address, web3, ownerAddress);
  });

  it('does not allow to get nonexistent contract address', async () => {
    await expect(headWrapper.contractAddressByName('fakeContract')).to.be.eventually.rejectedWith(Error);
  });

  it('does not allow to get internal contract address', async () => {
    await expect(headWrapper.contractAddressByName('bundleStore')).to.be.eventually.rejectedWith(Error);
  });

  describe('Gets available contracts addresses', () => {
    it('kycWhitelist', async () => {
      expect(await headWrapper.contractAddressByName('kycWhitelist')).to.equal(deployedMockContracts.kycWhitelist);
    });

    it('roles', async () => {
      expect(await headWrapper.contractAddressByName('roles')).to.equal(deployedMockContracts.roles);
    });

    it('fees', async () => {
      expect(await headWrapper.contractAddressByName('fees')).to.equal(deployedMockContracts.fees);
    });

    it('challenges', async () => {
      expect(await headWrapper.contractAddressByName('challenges')).to.equal(deployedMockContracts.challenges);
    });

    it('payouts', async () => {
      expect(await headWrapper.contractAddressByName('payouts')).to.equal(deployedMockContracts.payouts);
    });

    it('shelteringTransfers', async () => {
      expect(await headWrapper.contractAddressByName('shelteringTransfers')).to.equal(deployedMockContracts.shelteringTransfers);
    });

    it('sheltering', async () => {
      expect(await headWrapper.contractAddressByName('sheltering')).to.equal(deployedMockContracts.sheltering);
    });

    it('uploads', async () => {
      expect(await headWrapper.contractAddressByName('uploads')).to.equal(deployedMockContracts.uploads);
    });

    it('config', async () => {
      expect(await headWrapper.contractAddressByName('config')).to.equal(deployedMockContracts.config);
    });
  });
});
