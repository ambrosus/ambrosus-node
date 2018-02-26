const createAccountRequest = (fields) => ({
  content: {
    idData: {
      createdBy: adminAccountWithSecret.address,
      permissions: [],
      ...fields
    }
  }
});

const account = {
  address: '0x742e62cc7a19ef7d9c44306c07fad54b5bf6d4be',
  permissions: []
};

const accountWithSecret = {
  ...account,
  secret: '0x12df4781cc9b5aef9a566850f15b67e176eaf076d50804a29c7c19d8e635cea1'
};

const adminAccount = {
  address: '0x09aC6A0d898A8675DF378e23E9bD0E995C35841C'
};

const adminAccountWithSecret = {
  address: adminAccount.address,
  secret: '0xbe84d666f9bd798e69e548804015cfbe82ae97880e4366a5fdc2d5afade439c0'
};

const notRegisteredAccount = {
  address: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  secret: '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
  permissions: []
};

export {
  createAccountRequest, accountWithSecret, account, adminAccount, adminAccountWithSecret,
  notRegisteredAccount
};
