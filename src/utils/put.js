const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
const isString = (subject) => typeof subject === 'string';
const isArray = (subject) => Array.isArray(subject);

const put = (dict, path, value) => {
  if (isDict(path)) {
    return Object
      .keys(path)
      .reduce((transformedDict, pathIterator) => put(transformedDict, pathIterator, path[pathIterator]), dict);
  } else if (!isString(path) && !isArray(path)) {
    throw new Error('Path must be an string, an array or a dict');
  }

  const chain = isString(path) ? path.split('.') : path;

  if (chain.length === 1) {
    return {
      ...dict,
      [chain[0]]: value
    };
  }

  if (!isDict(dict[chain[0]])) {
    throw new Error('Path is invalid: non-object detected while traversing');
  }

  return {
    ...dict,
    [chain[0]]: put(dict[chain[0]] || {}, chain.slice(1), value)
  };
};

export default put;
