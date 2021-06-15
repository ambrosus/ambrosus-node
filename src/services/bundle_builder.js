/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import {AuthenticationError, ValidationError} from '../errors/errors';
import Filter from 'stream-json/filters/Filter';
import Asm from 'stream-json/Assembler';

const pipeline = import('util').promisify(import('stream').pipeline);

const LATEST_BUNDLE_VERSION = 3;

export default class BundleBuilder {
  constructor(identityManager, entityBuilder, supportDeprecatedBundleVersions = false) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.supportDeprecatedBundleVersions = supportDeprecatedBundleVersions;
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
      version: LATEST_BUNDLE_VERSION
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

  async validateStreamedBundleNoWrite(readStream, bundleItemsCountLimit) {
    const minimalBundleForValidation = await this.extractBundleDataNecessaryForValidationFromStream(readStream);
    this.validateBundleVersioned(minimalBundleForValidation, bundleItemsCountLimit);
  }

  async validateStreamedBundle(readStream, writeStream, bundleItemsCountLimit) {
    readStream.on('error', (err) => {
      writeStream.abort(err);
    });
    const [minimalBundleForValidation] = await Promise.all([
      this.extractBundleDataNecessaryForValidationFromStream(readStream),
      pipeline(readStream, writeStream)
    ]);
    this.validateBundleVersioned(minimalBundleForValidation, bundleItemsCountLimit);
    // todo: invalidate writeStream on validation errors
  }

  async extractBundleDataNecessaryForValidationFromStream(readableStream) {
    return new Promise(((resolve, reject) => {
      /**
       * Matches with:
       * - all fields in root path
       * - all fields in content path
       * - full content.idData object
       * - assetId fields in content.entries
       * - eventId fields in content.entries
       */
      const filterRegex = /^.{0}$|^(content\.)?[^.]+$|^content\.idData\.|^content\.entries\.\d+\.(assetId|eventId)$/;
      const tokenStream = readableStream.pipe(Filter.withParser({filter: filterRegex}));
      Asm.connectTo(tokenStream).on('done', (asm) => resolve(asm.current));
      tokenStream.on('error', (err) => reject(new ValidationError(err.message)));
    }));
  }

  validateBundleVersioned(bundle, bundleItemsCountLimit) {
    if (bundle.content.idData.version === LATEST_BUNDLE_VERSION) {
      this.validateBundle(bundle, bundleItemsCountLimit);
    } else if (this.supportDeprecatedBundleVersions) {
      this.validateBundleWithVersionBefore3(bundle, bundleItemsCountLimit);
    } else {
      throw new ValidationError(`Only bundles with version ${LATEST_BUNDLE_VERSION} are supported`);
    }
  }

  validateBundle(bundle, bundleItemsCountLimit) {
    const validator = validateAndCast(bundle)
      .required([
        'bundleId',
        'content.signature',
        'content.idData',
        'content.idData.createdBy',
        'content.idData.timestamp',
        'content.idData.entriesHash',
        'content.idData.version',
        'content.entries'
      ])
      .fieldsConstrainedToSet(['content', 'bundleId', 'metadata'])
      .fieldsConstrainedToSet(['idData', 'entries', 'signature'], 'content')
      .isNonNegativeInteger(['content.idData.timestamp'])
      .validate(['content.entries'], (entries) => entries.length <= bundleItemsCountLimit, 'Bundle size surpasses the limit')
      .validate(['content.idData.version'], (version) => version === LATEST_BUNDLE_VERSION, `Only bundles with version ${LATEST_BUNDLE_VERSION} are supported`);

    this.validateBundleHashes(validator, bundle.content.idData, this.extractIdsFromEntries(bundle.content.entries));

    try {
      this.identityManager.validateSignature(
        bundle.content.idData.createdBy,
        bundle.content.signature,
        bundle.content.idData
      );
    } catch (err) {
      if (err instanceof AuthenticationError) {
        // treat invalid signature as validation error
        throw new ValidationError(err.message);
      }
      throw err;
    }
  }

  validateBundleWithVersionBefore3(bundle, bundleItemsCountLimit) {
    validateAndCast(bundle)
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
      .isNonNegativeInteger(['content.idData.timestamp'])
      .validate(['content.entries'], (entries) => entries.length <= bundleItemsCountLimit, 'Bundle size surpasses the limit');
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
