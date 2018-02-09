import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import DataModelEngine from '../../src/services/data_model_engine';
import {ValidationError} from '../../src/errors/errors';

import pkPair from '../fixtures/pk_pair'; 

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Data Model Engine', () => {
  let modelEngine = null;
  let mockIdentityManager = null;
  let mockEntityBuilder = null;
  let mockEntityRepository = null;
  let mockAccountRepository = null;

  const mockAsset = {};

  beforeEach(() => {
    mockIdentityManager = {
      createKeyPair: sinon.stub()
    };
    mockAccountRepository = {
      store: sinon.stub()
    };
    mockEntityBuilder = {
      validateAsset: sinon.stub(),
      setAssetBundle: sinon.stub(),
      regenerateAssetId: sinon.stub()
    };
    mockEntityRepository = {
      storeAsset: sinon.stub()
    };
    modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository, mockAccountRepository);
  });

  describe('creating an account', () => {
    it('creates key pair with identityManager and stores with accountRepository', async () => {
      mockIdentityManager.createKeyPair.returns(pkPair);
      expect(await modelEngine.createAccount()).to.eq(pkPair);
      expect(mockIdentityManager.createKeyPair).to.have.been.called;
      expect(mockAccountRepository.store).to.have.been.calledWith(pkPair);
    });
  });

  describe('creating an asset', () => {
    it('validates with Entity Builder and sends to Entity Storage', async () => {
      mockEntityBuilder.regenerateAssetId.returns(mockAsset);
      mockEntityBuilder.setAssetBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();

      await expect(modelEngine.createAsset(mockAsset));

      expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      expect(mockEntityBuilder.regenerateAssetId).to.have.been.calledWith(mockAsset);
      expect(mockEntityBuilder.setAssetBundle).to.have.been.calledWith(mockAsset);
      expect(mockEntityRepository.storeAsset).to.have.been.calledWith(mockAsset);
    });

    it('validate with the Entity Builder and proxies the ValidationError', async () => {
      mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));

      await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
    });
  });
});
