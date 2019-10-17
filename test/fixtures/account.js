/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import allPermissions from '../../src/utils/all_permissions';

const addAccountRequest = (fields) => ({
  ...account,
  ...fields
});

const account = {
  address: '0x742E62CC7A19Ef7D9c44306C07FAd54B5bF6d4bE',
  active: true,
  permissions: [allPermissions.registerAccounts],
  accessLevel: 2,
  organization: 2
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
  permissions: [],
  accessLevel: 4
};

export {
  addAccountRequest, accountWithSecret, account, adminAccount, adminAccountWithSecret,
  notRegisteredAccount
};
