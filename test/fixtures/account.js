import pkPair from './pk_pair';
import addSignature from './add_signature';

const createAccountRequest = (fields) => ({
  content: {
    idData: {
      createdBy: pkPair.address,
      timestamp: Date.now(),
      ...fields
    }
  }
});

const createFullAccountRequest = (identityManager) =>
  addSignature(
    identityManager,
    createAccountRequest(
      {createdBy: adminAccountWithSecret.address}),
    adminAccountWithSecret.secret);

const account = {
  address: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616'
};

const accountWithSecret = {
  address: account.address,
  secret: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616f585cA8DFD95a476AB5D616'
};

const adminAccount = {
  address: '0x09aC6A0d898A8675DF378e23E9bD0E995C35841C'
};

const adminAccountWithSecret = {
  address: adminAccount.address,
  secret: '0xbe84d666f9bd798e69e548804015cfbe82ae97880e4366a5fdc2d5afade439c0'
};


export {createAccountRequest, accountWithSecret, account, adminAccount, adminAccountWithSecret, createFullAccountRequest};

