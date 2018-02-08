const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
const isString = (subject) => typeof subject === 'string';
const isArray = (subject) => Array.isArray(subject);

const serialize = (object) => {
  if (isDict(object)) {
    return `{${Object.keys(object)
      .sort()
      .map((key) => `'${key}':${serialize(object[key])}`)
      .join(',')
    }}`;
  } else if (isArray(object)) {
    return `[${object.map((item) => serialize(item))
      .join(',')}]`;
  } else if (isString(object)) {
    return `'${object}'`;
  }
  return object.toString();
};

export default serialize;



