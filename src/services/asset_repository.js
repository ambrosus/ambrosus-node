/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class AssetRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async storeAsset(asset) {
    if (await this.db.collection('assets').findOne({assetId: asset.assetId}) === null) {
      await this.db.collection('assets').insertOne(asset);

      console.log(`storeAsset(${asset.assetId}): stored`);
    } else {
      console.log(`storeAsset(${asset.assetId}): already stored`);
    }
  }

  async getAsset(assetId) {
    await this.db.collection('assets').findOne({assetId});
  }
}
