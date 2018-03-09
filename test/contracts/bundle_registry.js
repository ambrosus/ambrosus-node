import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../src/utils/web3_tools';
import deployContracts from '../helpers/contracts';
import {adminAccount} from '../fixtures/account';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Bundle Registry Contract', () => {
  const bundleId = 'bundleId';
  const vendor = adminAccount.address;
  let bundleRegistry;
  let web3;
  let ownerAddress;
  let otherAddress;

  beforeEach(async () => {
    web3 = await createWeb3();
    ({bundleRegistry} = await deployContracts(web3));
    [ownerAddress, otherAddress] = await web3.eth.getAccounts();
  });

  describe('Whitelisthig', () => {
    it('only owner should be whitelisted at the beginning', async () => {
      expect(await bundleRegistry.methods.isWhitelisted(ownerAddress).call()).to.eq(true);
      expect(await bundleRegistry.methods.isWhitelisted(otherAddress).call()).to.eq(false);
    });

    it('owner can add/remove whitelisted addresses', async () => {
      await bundleRegistry.methods.addToWhitelist(otherAddress).send({
        from: ownerAddress
      });
      expect(await bundleRegistry.methods.isWhitelisted(otherAddress).call()).to.eq(true);
      await bundleRegistry.methods.removeFromWhitelist(otherAddress).send({
        from: ownerAddress
      });
      expect(await bundleRegistry.methods.isWhitelisted(otherAddress).call()).to.eq(false);
    });

    it('not whitelisted non-owner cannot add/remove whitelisted addresses', async () => {
      await expect(bundleRegistry.methods.addToWhitelist(otherAddress).send({
        from: otherAddress
      })).to.be.rejected;
      await expect(bundleRegistry.methods.removeFromWhitelist(otherAddress).send({
        from: otherAddress
      })).to.be.rejected;
    });

    it('whitelisted non-owner cannot add/remove whitelisted addresses', async () => {
      await bundleRegistry.methods.addToWhitelist(otherAddress).send({
        from: ownerAddress
      });
      await expect(bundleRegistry.methods.addToWhitelist(otherAddress).send({
        from: otherAddress
      })).to.be.rejected;
      await expect(bundleRegistry.methods.removeFromWhitelist(otherAddress).send({
        from: otherAddress
      })).to.be.rejected;
    });
  });


  describe('Adding bundles', () => {
    it('returns empty address if no bundle with such id stored', async () => {
      const emptyAddress = await bundleRegistry.methods.bundleVendors(web3.utils.utf8ToHex('notExists')).call();
      expect(emptyAddress).to.match(/0x0{32}/);
    });

    it('stores bundleId/uploader_vendorId pairs', async () => {
      await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex(bundleId), vendor).send({
        from: ownerAddress
      });
      const vendorAddress = await bundleRegistry.methods.bundleVendors(web3.utils.utf8ToHex(bundleId)).call();
      expect(vendorAddress).to.eq(vendor);
    });

    it('non-whitelisted address cannot add bundle', async () => {
      await expect(bundleRegistry.methods.addBundle(web3.utils.utf8ToHex(bundleId), vendor).send({
        from: otherAddress
      })).to.be.rejected;
    });

    it('non-owner can add bundle after being whitelisted', async () => {
      await bundleRegistry.methods.addToWhitelist(otherAddress).send({
        from: ownerAddress
      });
      await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex(bundleId), vendor).send({
        from: otherAddress
      });
      const vendorAddress = await bundleRegistry.methods.bundleVendors(web3.utils.utf8ToHex(bundleId)).call();
      expect(vendorAddress).to.eq(vendor);
    });

    it('emits event when bundle added', async () => {
      const callback = sinon.spy();
      // eslint-disable-next-line new-cap
      bundleRegistry.events.BundleAdded().on('data', callback);
      expect(callback).to.be.not.called;
      await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex(bundleId), vendor).send({
        from: ownerAddress
      });
      await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex('bundle2'), vendor).send({
        from: ownerAddress
      });
      expect(callback).to.be.calledTwice;
      const [event] = callback.getCall(0).args;
      expect(web3.utils.hexToUtf8(event.returnValues.bundleId)).to.eq(bundleId);
      const [event2] = callback.getCall(1).args;
      expect(web3.utils.hexToUtf8(event2.returnValues.bundleId)).to.eq('bundle2');
    });
  });
});
