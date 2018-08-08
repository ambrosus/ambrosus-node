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
  let rolesWrapperMock;
  let configWrapperMock;

  describe('onboardedRole', () => {
    beforeEach(async () => {
      rolesWrapperMock = {
        onboardedRole: sinon.stub()
      };
      rolesRepository = new RolesRepository(rolesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      rolesWrapperMock.onboardedRole.resolves('1');
      const role = await rolesRepository.onboardedRole(address);
      expect(rolesWrapperMock.onboardedRole).to.be.calledWith(address);
      expect(role.name).to.equal('ATLAS');
    });

    it('correctly decodes roles names', async () => {
      rolesWrapperMock.onboardedRole.resolves('0');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('NONE');
      rolesWrapperMock.onboardedRole.resolves('1');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('ATLAS');
      rolesWrapperMock.onboardedRole.resolves('2');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('HERMES');
      rolesWrapperMock.onboardedRole.resolves('3');
      expect((await rolesRepository.onboardedRole(address)).name).to.equal('APOLLO');
    });
  });

  describe('onboardAsAtlas', () => {
    const stake = '100';
    const url = 'url';

    beforeEach(async () => {
      rolesWrapperMock = {
        onboardAsAtlas: sinon.stub()
      };
      configWrapperMock = {
        atlas1Stake: sinon.stub().resolves(stake)
      };
      rolesRepository = new RolesRepository(rolesWrapperMock, configWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await rolesRepository.onboardAsAtlas(address, url);
      expect(configWrapperMock.atlas1Stake).to.be.calledOnce;
      expect(rolesWrapperMock.onboardAsAtlas).to.be.calledWith(address, stake, url);
    });
  });

  describe('onboardAsHermes', () => {
    const url = 'url';

    beforeEach(async () => {
      rolesWrapperMock = {
        onboardAsHermes: sinon.stub()
      };
      rolesRepository = new RolesRepository(rolesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await rolesRepository.onboardAsHermes(address, url);
      expect(rolesWrapperMock.onboardAsHermes).to.be.calledWith(address, url);
    });
  });
});
