/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {InvalidParametersError} from '../errors/errors';

const castToNumberOrThrow = (input) => {
  const number = Number(input);
  if (isNaN(number)) {
    throw new InvalidParametersError(`${input} is not a valid number`);
  }
  return number;
};

const castToCoordinatesOrThrow = (input) => {
  const extractCoordinatesRegex = /^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*$/gi;
  const parseResult = extractCoordinatesRegex.exec(input);
  if (parseResult) {
    const [, lon, lat, rad] = parseResult;
    const parsedLon = parseFloat(lon);
    if (parsedLon < -180 || parsedLon > 180) {
      throw new InvalidParametersError('Longitude must be between -180 and 180');
    }
    const parsedLat = parseFloat(lat);
    if (parsedLat < -90 || parsedLat > 90) {
      throw new InvalidParametersError('Latitude must be between -90 and 90');
    }
    const parsedRad = parseFloat(rad);
    return {locationLongitude : parsedLon, locationLatitude : parsedLat, locationMaxDistance : parsedRad};
  }
  throw new InvalidParametersError('Location query must be of format `geo(lon, lat, rad)`');
};

const deepMapObject = (input, transformFunc) => Object.keys(input).reduce(
  (accumulated, key) => {
    const value = input[key];
    if ((typeof value) === 'object') {
      accumulated[key] = deepMapObject(value, transformFunc);
    } else {
      accumulated[key] = transformFunc(value, key);
    }
    return accumulated;
  },
  {});

const applyDecorators = (input, decorators) => deepMapObject(
  input,
  (value) => {
    // searches for and splits a string of the form `decorator(parameter)`
    const extractDecoratorRegex = /^([^(\s]*)\((.+)\)$/gi;
    const regexResult = extractDecoratorRegex.exec(value);
    if (regexResult) {
      const [, decorator, decoratorParameter] = regexResult;
      const decoratorFunc = decorators[decorator];
      if (decoratorFunc) {
        return decoratorFunc(decoratorParameter);
      }
    }
    return value;
  }
);

const ensureDataParamsValuesNotObjects = (entries) => {
  const keys = Object.keys(entries);
  keys.forEach((key) => {
    if (typeof entries[key] === 'object') {
      throw new InvalidParametersError('Data parameters should not be array or object type');
    }
  });
};

const queryParameterProcessorMiddleware = (req, res, next) => {
  if (req.query.data !== undefined) {
    ensureDataParamsValuesNotObjects(req.query.data);
  }
  req.query = applyDecorators(
    req.query,
    {
      number: (value) => castToNumberOrThrow(value),
      geo: (value) => castToCoordinatesOrThrow(value)
    }
  );

  next();
};

export default queryParameterProcessorMiddleware;

