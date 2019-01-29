/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import {ValidationError} from '../errors/errors';

export default class BundleBuilder {
  constructor(identityManager, entityBuilder) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
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
      timestamp
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

  validateBundle(bundle, version) {
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

    switch (version) {
      case 1:
        this.validateBundleHashes(validator, bundle.content, bundle.content.entries);
        break;
      case 2:
        this.validateBundleHashes(validator, bundle.content.idData, this.extractIdsFromEntries(bundle.content.entries));
        break;
      default:
        throw new ValidationError(`Unexpected bundle version: ${version}`);
    }

    this.identityManager.validateSignature(
      bundle.content.idData.createdBy,
      bundle.content.signature,
      bundle.content.idData
    );
  }

  validateBundleHashes(validator, bundleIdHashedData, entriesHashedData) {
    validator.validate(
      ['bundleId'],
      (hash) => this.identityManager.checkHashMatches(hash, bundleIdHashedData),
      `bundleId value doesn't match the content hash`
    ).validate(
      ['content.idData.entriesHash'],
      (hash) => this.identityManager.checkHashMatches(hash, entriesHashedData),
      `entriesHash value doesn't match the entries hash`
    );
  }

  validateBundleMetadata(bundleMetadata) {
    validateAndCast(bundleMetadata)
      .required(['bundleId'])
      .isHash(['bundleId']);
  }
}
