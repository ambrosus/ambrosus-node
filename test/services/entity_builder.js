import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {pick, put} from '../../src/utils/dict_utils';
import {createWeb3} from '../../src/utils/web3_tools';

import EntityBuilder from '../../src/services/entity_builder';
import {createAsset, addSignatureToAsset} from '../fixtures/asset_fixture_builder';
import {ValidationError} from '../../src/errors/errors';
import IdentityManager from '../../src/services/identity_manager';

chai.use(sinonChai);
const {expect} = chai;

describe('Entity Builder', () => {
  let web3 = null;
  let entityBuilder = null;
  let mockIdentityManager = null;
  let exampleAsset = null;

  before(async () => {
    web3 = await createWeb3();
    const identityManager = new IdentityManager(web3);
    exampleAsset = addSignatureToAsset(identityManager, createAsset());
  });

  beforeEach(() => {
    mockIdentityManager = {
      validateSignature: sinon.stub(),
      calculateHash: sinon.stub()
    };
    entityBuilder = new EntityBuilder(mockIdentityManager);
  });

  describe('validating an asset', () => {
    for (const field of ['content', 'content.signature', 'content.idData', 'content.idData.createdBy', 'content.idData.timestamp', 'content.idData.sequenceNumber']) {
      // eslint-disable-next-line no-loop-func
      it(`throws if the ${field} field is missing`, () => {
        const brokenAssset = pick(exampleAsset, field);
        expect(() => entityBuilder.validateAsset(brokenAssset)).to.throw(ValidationError);
      });
    }

    it('uses the IdentityManager for checking signature (correct)', () => {
      expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw();
      expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
    });

    it('uses the IdentityManager for checking signature (incorrect)', () => {
      mockIdentityManager.validateSignature.throws(new ValidationError('Signature is invalid'));

      expect(() => entityBuilder.validateAsset(exampleAsset)).to.throw(ValidationError);
      expect(mockIdentityManager.validateSignature).to.have.been.calledOnce;
    });

    it('passes for proper asset', () => {
      expect(() => entityBuilder.validateAsset(exampleAsset)).to.not.throw(ValidationError);
    });

    it('doesn\'t allow root-level fields other than content, and assetId', () => {
      const brokenAssset = put(exampleAsset, 'metadata', 'abc');
      expect(() => entityBuilder.validateAsset(brokenAssset)).to.throw(ValidationError);
    });
  });

  it('setting the bundle Id for an asset', () => {
    const modifiedAsset = entityBuilder.setAssetBundle(exampleAsset, 'abc');
    expect(modifiedAsset.metadata.bundleId).to.equal('abc');
  });

  it('regenerating assetId', () => {
    const mockHash = 'xyz';
    mockIdentityManager.calculateHash.returns(mockHash);

    const regenerated = entityBuilder.regenerateAssetId(exampleAsset);
    expect(mockIdentityManager.calculateHash).to.have.been.calledWith(exampleAsset.content);
    expect(regenerated.assetId).to.equal(mockHash);
  });
});
