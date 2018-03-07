import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {createWeb3, getDefaultAddress} from '../../src/utils/web3_tools';
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

  beforeEach(async () => {
    web3 = await createWeb3();
    ({bundleRegistry} = await deployContracts(web3));
  });

  it('returns empty address if no bundle with such id stored', async () => {
    const emptyAddress = await bundleRegistry.methods.bundleVendors(web3.utils.utf8ToHex('notExists')).call();
    expect(emptyAddress).to.match(/0x0{32}/);
  });

  it('stores bundleId/uploader_vendorId pairs', async () => {
    await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex(bundleId), vendor).send({
      from: getDefaultAddress(web3)
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
      from: getDefaultAddress(web3)
    });
    await bundleRegistry.methods.addBundle(web3.utils.utf8ToHex('bundle2'), vendor).send({
      from: getDefaultAddress(web3)
    });
    expect(callback).to.be.calledTwice;
    const [event] = callback.getCall(0).args;
    expect(web3.utils.hexToUtf8(event.returnValues.bundleId)).to.eq(bundleId);
    const [event2] = callback.getCall(1).args;
    expect(web3.utils.hexToUtf8(event2.returnValues.bundleId)).to.eq('bundle2');
  });
});
