import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {addAccountHandler, getAccountHandler, modifyAccountHandler} from '../../src/routes/accounts';
import {accountWithSecret, adminAccountWithSecret, account} from '../fixtures/account';
import {put} from '../../src/utils/dict_utils';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Accounts', () => {
  let mockModelEngine = null;
  let req = null;
  let res = null;

  beforeEach(async () => {
    mockModelEngine = {
      addAccount: sinon.stub(),
      getAccount: sinon.stub(),
      modifyAccount: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();
  });

  describe('creating account', () => {
    let injectedHandler;
    let mockAccount;
    const requestedPermissions = ['perm1', 'perm2'];
    const tokenData = {createdBy : adminAccountWithSecret.address, validUntil: 423543253453};
    const accountregistrationRequest = {registeredBy: tokenData.createdBy, permissions : requestedPermissions};

    beforeEach(async () => {
      mockAccount = put(accountWithSecret, {permissions : requestedPermissions, registeredBy : adminAccountWithSecret.address});
      mockModelEngine.addAccount.resolves(mockAccount);
      req.body = accountregistrationRequest;
      req.tokenData = tokenData;
      injectedHandler = addAccountHandler(mockModelEngine);
    });

    it('pushes json body into Data Model Engine and proxies result', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.addAccount).to.have.been.calledWith(accountregistrationRequest, tokenData);
    
      expect(res._getStatusCode()).to.eq(201);
      expect(res._isJSON()).to.be.true;
    });
  });

  describe('getting account by id', () => {
    let injectedHandler;
    let mockAccount;
    const accountPermissions = ['perm1', 'perm2'];
    const tokenData = {createdBy : adminAccountWithSecret.address, validUntil: 423543253453};

    beforeEach(async () => {
      mockAccount = put(account, {permissions : accountPermissions, registeredBy : adminAccountWithSecret.address});
      mockModelEngine.addAccount.resolves(mockAccount);
      req.params.id = mockAccount.address;
      req.tokenData = tokenData;
      injectedHandler = getAccountHandler(mockModelEngine);
    });

    it('passes requested id to Data Model Engine and proxies result', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.getAccount).to.have.been.calledWith(mockAccount.address, tokenData);
    
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
    });
  });

  describe('modify account', () => {
    let injectedHandler;
    let mockAccount;
    const requestedPermissions = ['perm1', 'perm2'];
    const tokenData = {createdBy : adminAccountWithSecret.address, validUntil: 423543253453};
    const accountModificationRequest = {permissions : requestedPermissions};

    beforeEach(async () => {
      mockAccount = put(accountWithSecret, {permissions : requestedPermissions, registeredBy : adminAccountWithSecret.address});
      mockModelEngine.modifyAccount.resolves(mockAccount);
      req.body = accountModificationRequest;
      req.params.id = account.address;
      req.tokenData = tokenData;
      injectedHandler = modifyAccountHandler(mockModelEngine);
    });

    it('pushes json body into Data Model Engine and proxies result', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.modifyAccount).to.have.been.calledWith(account.address, accountModificationRequest, tokenData);
    
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
    });
  });
});

