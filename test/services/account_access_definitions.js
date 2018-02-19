import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {PermissionError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Account Access Definitions', () => {
  let mockPermissionRepository;
  let accountAccessDefinitions;
  const adminAddress = '0x123456';
  const mockAddress = '0xabcde';
  const mockPermissions = ['permission'];

  beforeEach(() => {
    mockPermissionRepository = {
      setPermissions: sinon.stub(),
      getPermissions: sinon.stub()
    };
    mockPermissionRepository.getPermissions.resolves([]);
    mockPermissionRepository.getPermissions.withArgs(adminAddress).resolves(['change_account_permissions']);
    accountAccessDefinitions = new AccountAccessDefinitions(mockPermissionRepository);
  });

  describe('changing permissions', () => {
    it('account with `change_account_permissions` can set permissions', async () => {
      await accountAccessDefinitions.setPermissions(mockAddress, mockPermissions, adminAddress);
      expect(mockPermissionRepository.setPermissions).to.be.calledOnce;
      expect(mockPermissionRepository.getPermissions).to.be.calledOnce;
      expect(mockPermissionRepository.getPermissions).to.have.calledWith(adminAddress);
    });

    it('account without `change_account_permissions` can not set permission', async () => {
      await expect(accountAccessDefinitions.setPermissions(mockAddress, mockPermissions, mockAddress))
        .to.eventually.be.rejectedWith(PermissionError);
      expect(mockPermissionRepository.setPermissions).to.be.not.called;
      expect(mockPermissionRepository.getPermissions).to.be.calledOnce;
      expect(mockPermissionRepository.getPermissions).to.have.calledWith(mockAddress);
    });
  });

  describe('admin permissions', () => {
    beforeEach(async () => {
      await accountAccessDefinitions.createAdminAccountPermissions(adminAddress);
    });

    it('should add `change_account_permissions` and `create_account` to admin account', async () => {
      expect(mockPermissionRepository.setPermissions).to.be.calledWith(adminAddress,
        ['change_account_permissions', 'create_account']);
    });
  });
});
