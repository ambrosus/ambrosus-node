/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import RolesRepository from '../../src/services/roles_repository';

chai.use(sinonChai);
const {expect} = chai;

describe('Roles repository', () => {
  const address = '0xc0ffee';
  let rolesRepository;
  let contractManagerMock;

  describe('onboardedRole', () => {
    const getRoleStub = sinon.stub();
    const getRoleCallStub = sinon.stub();

    beforeEach(async () => {
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            getOnboardedRole: getRoleStub
          }
        })
      };
      getRoleStub.returns({
        call: getRoleCallStub
      });
      rolesRepository = new RolesRepository(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      getRoleCallStub.resolves('1');
      const role = await rolesRepository.onboardedRole(address);
      expect(getRoleStub).to.be.calledWith(address);
      expect(getRoleCallStub).to.be.calledOnce;
      expect(role.name).to.equal('ATLAS');
    });

    it('correctly decodes roles names', async () => {
      getRoleCallStub.resolves('0');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('NONE');
      getRoleCallStub.resolves('1');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('ATLAS');
      getRoleCallStub.resolves('2');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('HERMES');
      getRoleCallStub.resolves('3');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('APOLLO');
    });
  });

  describe('onboardAsAtlas', () => {
    const onboardAsAtlasStub = sinon.stub();
    const onboardAsAtlasSendStub = sinon.stub();
    const stake = 100;
    const url = 'url';

    beforeEach(async () => {
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            onboardAsAtlas: onboardAsAtlasStub
          }
        })
      };
      onboardAsAtlasStub.returns({
        send: onboardAsAtlasSendStub
      });
      rolesRepository = new RolesRepository(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesRepository.onboardAsAtlas(address, stake, url);
      expect(onboardAsAtlasStub).to.be.calledWith(url);
      expect(onboardAsAtlasSendStub).to.be.calledWith({
        from: address,
        value: stake
      });
    });
  });

  describe('onboardAsHermes', () => {
    const onboardAsHermesStub = sinon.stub();
    const onboardAsHermesSendStub = sinon.stub();
    const url = 'url';

    beforeEach(async () => {
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            onboardAsHermes: onboardAsHermesStub
          }
        })
      };
      onboardAsHermesStub.returns({
        send: onboardAsHermesSendStub
      });
      rolesRepository = new RolesRepository(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesRepository.onboardAsHermes(address, url);
      expect(onboardAsHermesStub).to.be.calledWith(url);
      expect(onboardAsHermesSendStub).to.be.calledWith({
        from: address
      });
    });
  });
});
