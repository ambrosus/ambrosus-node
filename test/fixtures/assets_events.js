import {put, get} from '../../src/utils/dict_utils';
import pkPair from './pk_pair';
import addSignature from './add_signature';
import {getTimestamp} from '../../src/utils/time_utils';

export const createAsset = (fields) => ({
  content: {
    idData: {
      createdBy: pkPair.address,
      timestamp: getTimestamp(),
      sequenceNumber: 0,
      ...fields
    }
  }
});

export const createEvent = (fields, data = [{type: 'ambrosus.event.example'}]) => ({
  content: {
    idData: {
      assetId: '0x6666',
      createdBy: pkPair.address,
      timestamp: getTimestamp(),
      accessLevel: 0,
      ...fields
    },
    data
  }
});

export const createBundle = (fields, entries = []) => ({
  content: {
    idData: {
      createdBy: pkPair.address,
      timestamp: getTimestamp(),
      ...fields
    },
    entries: [
      ...entries
    ]
  }
});

const addHash = (identityManager, object, fromPath, toPath) => {
  const hash = identityManager.calculateHash(get(object, fromPath));
  return put(object, toPath, hash);
};

export const addAssetId = (identityManager, asset) => addHash(identityManager, asset, 'content', 'assetId');

export const addDataHashToEvent = (identityManager, event) => addHash(identityManager, event, 'content.data', 'content.idData.dataHash');
export const addEventId = (identityManager, event) => addHash(identityManager, event, 'content', 'eventId');

export const addEntriesHashToBundle = (identityManager, bundle) => addHash(identityManager, bundle, 'content.entries', 'content.idData.entriesHash');
export const addBundleId = (identityManager, bundle) => addHash(identityManager, bundle, 'content', 'bundleId');

export const createFullAsset = (identityManager, idDataFields = {}, secret = pkPair.secret) =>
  addAssetId(
    identityManager,
    addSignature(
      identityManager,
      createAsset(idDataFields),
      secret)
  );

export const createFullEvent = (identityManager, idDataFields = {}, data = [{type: 'ambrosus.event.example'}], secret = pkPair.secret) =>
  addEventId(
    identityManager,
    addSignature(
      identityManager,
      addDataHashToEvent(
        identityManager,
        createEvent(
          idDataFields,
          data
        )
      ),
      secret));

export const createFullBundle = (identityManager, idDataFields = {}, entries = [], secret = pkPair.secret) =>
  addBundleId(
    identityManager,
    addSignature(
      identityManager,
      addEntriesHashToBundle(
        identityManager,
        createBundle(
          idDataFields,
          entries
        )
      ),
      secret));
