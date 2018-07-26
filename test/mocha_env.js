/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
process.env.NODE_ENV = 'test';
process.env.WEB3_RPC = 'ganache';
process.env.WEB3_NODEPRIVATEKEY = '0xfa654acfc59f0e4fe3bd57082ad28fbba574ac55fe96e915f17de27ad9c77696';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ambrosus';
process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED = true;
