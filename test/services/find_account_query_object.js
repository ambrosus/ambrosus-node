/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// describe('Finding accounts', () => {
//   let accounts;
//   beforeEach(async () => {
//     accounts = [
//       put(account, {registeredBy: '0x123', registeredOn: 1, permissions: ['perm1', 'perm2']}),
//       put(notRegisteredAccount, {registeredBy: '0x123', registeredOn: 4, permissions: ['perm1', 'perm2']}),
//       put(adminAccountWithSecret, {registeredBy: '0x123', permissions: ['perm1']})];
//     await Promise.all(accounts.map((accountToStore) => accountStore.store(accountToStore)));
//   });

//   it('returns accounts sorted by registration time', async () => {
//     const found = await accountStore.find();
//     expect(found.results).to.deep.equal([accounts[1],accounts[0],accounts[2]]);
//     expect(found.resultCount).to.equal(3);
//   });
// });
