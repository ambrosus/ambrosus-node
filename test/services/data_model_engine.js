import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import DataModelEngine from '../../src/services/data_model_engine';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Data Model Engine', () => {
  let mockIdentityManager = null;
  let mockAccountRepository = null;
  let modelEngine;
  const mockKeyPair = {
    address: '0xEA3CA04478bb2D3Adbba8a3BBc90f84D4222d124',
    secret: '0x3Adbba8a3BBc90f84D4222d124EA3CA04478bb2D4D4222d124EA3CA04478bb2D'
  };

  beforeEach(() => {
    mockIdentityManager = {
      createKeyPair : sinon.stub()
    };
    mockAccountRepository = {
      store : sinon.stub()
    };
    modelEngine = new DataModelEngine(null, mockIdentityManager, mockAccountRepository);
  });

  describe('creating an account', () => {
    it('creates key pair with identityManager and stores with accountRepository', async () => {
      mockIdentityManager.createKeyPair.returns(mockKeyPair);
      expect(await modelEngine.createAccount()).to.eq(mockKeyPair);
      expect(mockIdentityManager.createKeyPair).to.have.been.called;
      expect(mockAccountRepository.store).to.have.been.calledWith(mockKeyPair);
    });
  });
});
