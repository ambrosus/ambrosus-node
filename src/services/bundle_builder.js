/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';

export default class BundleBuilder {
  constructor(identityManager, entityBuilder, bundleVersion) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.bundleVersion = bundleVersion;
  }

  extractIdsFromEntries(entries) {
    return entries.map((entry) => entry.assetId || entry.eventId);
  }

  assembleBundle(assets, events, timestamp, secret) {
    const createdBy = this.identityManager.addressFromSecret(secret);
    const preparedEvents = events.map((event) => this.entityBuilder.prepareEventForBundlePublication(event));
    const entries = [
      ...assets,
      ...preparedEvents
    ].map((entry) => this.entityBuilder.removeBundle(entry));
    const entriesHash = this.identityManager.calculateHash(this.extractIdsFromEntries(entries));
    const idData = {
      createdBy,
      entriesHash,
      timestamp,
      version: this.bundleVersion
    };
    const signature = this.identityManager.sign(secret, idData);
    const content = {
      signature,
      idData,
      entries
    };
    const bundleId = this.identityManager.calculateHash(content.idData);

    return {
      bundleId,
      content
    };
  }

  validateBundle(bundle) {
    const validator = validateAndCast(bundle)
      .required([
        'bundleId',
        'content.signature',
        'content.idData',
        'content.idData.createdBy',
        'content.idData.timestamp',
        'content.idData.entriesHash',
        'content.entries'
      ])
      .fieldsConstrainedToSet(['content', 'bundleId', 'metadata'])
      .fieldsConstrainedToSet(['idData', 'entries', 'signature'], 'content')
      .isNonNegativeInteger(['content.idData.timestamp']);

    if (bundle.content.idData.version) {
      validator.validate(
        ['bundleId'],
        (hash) => this.identityManager.checkHashMatches(hash, bundle.content.idData),
        `bundleId value doesn't match the content hash`
      ).validate(
        ['content.idData.entriesHash'],
        (hash) => this.identityManager.checkHashMatches(hash, this.extractIdsFromEntries(bundle.content.entries)),
        `entriesHash value doesn't match the entries hash`
      );
    }

    this.identityManager.validateSignature(
      bundle.content.idData.createdBy,
      bundle.content.signature,
      bundle.content.idData
    );
  }

  validateBundleMetadata(bundleMetadata) {
    validateAndCast(bundleMetadata)
      .required(['bundleId'])
      .isHash(['bundleId']);
  }
}
