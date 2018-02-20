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
  address: '0x742e62cc7a19ef7d9c44306c07fad54b5bf6d4be'
};

const accountWithSecret = {
  address: account.address,
  secret: '0x12df4781cc9b5aef9a566850f15b67e176eaf076d50804a29c7c19d8e635cea1'
};

const adminAccount = {
  address: '0x09aC6A0d898A8675DF378e23E9bD0E995C35841C'
};

const adminAccountWithSecret = {
  address: adminAccount.address,
  secret: '0xbe84d666f9bd798e69e548804015cfbe82ae97880e4366a5fdc2d5afade439c0'
};


export {createAccountRequest, accountWithSecret, account, adminAccount, adminAccountWithSecret, createFullAccountRequest};

