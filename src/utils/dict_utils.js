/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
const isString = (subject) => typeof subject === 'string';
const isArray = (subject) => Array.isArray(subject);

const pickKey = (dict, key) => Object.keys(dict)
  .filter((subject) => subject !== key)
  .reduce((reduced, keyIterator) => ({...reduced, [keyIterator]: dict[keyIterator]}), {});

const pickChain = (dict, chain) => {
  const [firstOnChain, ...restOfChain] = chain;

  if (!firstOnChain) {
    throw new Error('Path is invalid: it shouldn\'t be empty string');
  }

  if (restOfChain.length === 0) {
    return pickKey(dict, firstOnChain);
  }

  if (!isDict(dict[firstOnChain])) {
    throw new Error('Path is invalid: non-object detected while traversing');
  }

  return {
    ...dict,
    [firstOnChain]: pickChain(dict[firstOnChain], restOfChain)
  };
};

const pick = (dict, path) => {
  if (isArray(path)) {
    return path.reduce((transformedDict, pathIterator) => pick(transformedDict, pathIterator), dict);
  } else if (isString(path)) {
    const chain = path.split('.');
    return pickChain(dict, chain);
  }

  throw new Error('Path must be an string, or an array');
};

const putKey = (dict, key, value) => ({
  ...dict,
  [key]: value
});

const putChain = (dict, chain, value) => {
  const [firstOnChain, ...restOfChain] = chain;

  if (!firstOnChain) {
    throw new Error('Path is invalid: it shouldn\'t be empty string');
  }

  if (restOfChain.length === 0) {
    return putKey(dict, firstOnChain, value);
  }

  const childDict = dict[firstOnChain] || {};

  if (!isDict(childDict)) {
    throw new Error('Path is invalid: non-object detected while traversing');
  }

  return {
    ...dict,
    [firstOnChain]: putChain(childDict, restOfChain, value)
  };
};

const put = (dict, path, value) => {
  if (isDict(path)) {
    return Object
      .keys(path)
      .reduce((transformedDict, pathIterator) => put(transformedDict, pathIterator, path[pathIterator]), dict);
  } else if (isString(path)) {
    const chain = path.split('.');
    return putChain(dict, chain, value);
  }

  throw new Error('Path must be an string, or an dict');
};

const get = (dict, path) => {
  let result = dict;
  for (const key of path.split('.').filter((key) => key.length > 0)) {
    result = result[key];
    if (typeof result === 'undefined') {
      return undefined;
    }
  }
  return result;
};

export {put, pick, get};
