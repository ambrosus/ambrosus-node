import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Aparatus from '../helpers/aparatus';
import {
  adminAccountWithSecret,
  accountWithSecret,
  createAccountRequest,
  createFullAccountRequest,
  createFullPermissionRequest
} from '../fixtures/account';
import addSignature from '../fixtures/add_signature';


chai.use(chaiHttp);
chai.use(chaiAsPromissed);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let aparatus;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
  });

  beforeEach(async () => {
    await aparatus.cleanDB();
    await aparatus.modelEngine.createAdminAccount(adminAccountWithSecret);
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      const account = await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      const response = await aparatus.request()
        .get(`/accounts/${account.body.content.address}`)
        .send({});
      expect(response.body.content.address).to.equal(account.body.content.address);
      expect(response.body.content.secret).to.be.undefined;
    });

    it('should return 404 code if non-existing account', async () => {
      const pendingRequest = aparatus.request()
        .get(`/accounts/0x1234567`)
        .send({});
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('Create an account', () => {
    it('should create an account (client signed)', async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      const account = await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should create an account (server signed)', async () => {
      const signedAccountRequest = createAccountRequest({createdBy: adminAccountWithSecret.address});
      const account = await aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB ${adminAccountWithSecret.secret}`)
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should fail to create account if no signature', async () => {
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const request = addSignature(aparatus.identityManager,
        createAccountRequest({
          createdBy:
            nonExistingUser.address
        }), nonExistingUser.secret);
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(request);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });

    it('should throw 403 if account has no permissions for creation', async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      const newAccount = (await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest)).body;
      const signedAccountByNotAdmin = createFullAccountRequest(aparatus.identityManager, newAccount.content);
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(signedAccountByNotAdmin);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('Permissions', () => {
    let newAccount;

    beforeEach(async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      newAccount = (await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest)).body;
    });

    it('admin can update permissions', async () => {
      const signedPermissionRequest = createFullPermissionRequest(aparatus.identityManager, newAccount.content.address);
      await aparatus.request()
        .put('/accounts/permissions')
        .send(signedPermissionRequest);
      const result = await aparatus.request()
        .get(`/accounts/${newAccount.content.address}`)
        .send({});
      expect(result.body.content.permissions).to.deep.eq(signedPermissionRequest.idData.permissions);
    });

    it('non-admin cannot update permissions', async () => {
      const signedPermissionRequest = createFullPermissionRequest(aparatus.identityManager, newAccount.content.address,
        {}, newAccount.content);
      const pendingRequest = aparatus.request()
        .put('/accounts/permissions')
        .send(signedPermissionRequest);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    describe('non-admin account receives permissions from admin', () => {
      beforeEach(async () => {
        const signedPermissionRequest = createFullPermissionRequest(aparatus.identityManager, newAccount.content.address,
          {permissions: ['create_account', 'change_account_permissions']});
        await aparatus.request()
          .put('/accounts/permissions')
          .send(signedPermissionRequest);
      });

      it('account can create new accounts', async () => {
        const signedAccountByNotAdmin = createFullAccountRequest(aparatus.identityManager, newAccount.content);
        const account = await aparatus.request()
          .post('/accounts')
          .send(signedAccountByNotAdmin);
        const response = await aparatus.request()
          .get(`/accounts/${account.body.content.address}`)
          .send({});
        expect(response.body.content.address).to.equal(account.body.content.address);
        expect(response.body.content.secret).to.be.undefined;
      });

      it('account can change permissions', async () => {
        const signedPermissionRequest = createFullPermissionRequest(aparatus.identityManager, newAccount.content.address,
          {}, newAccount.content);
        await aparatus.request()
          .put('/accounts/permissions')
          .send(signedPermissionRequest);
        const result = await aparatus.request()
          .get(`/accounts/${newAccount.content.address}`)
          .send({});
        expect(result.body.content.permissions).to.deep.eq(signedPermissionRequest.idData.permissions);
      });
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
