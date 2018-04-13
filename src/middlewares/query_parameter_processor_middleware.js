import {InvalidParametersError} from '../errors/errors';

const castToNumberOrThrow = (input) => {
  const number = Number(input);
  if (isNaN(number)) {
    throw new InvalidParametersError('${input} is not a valid number');
  }
  return number;
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

const queryParameterProcessorMiddleware = (req, res, next) => {
  req.query = applyDecorators(
    req.query,
    {
      number: (value) => castToNumberOrThrow(value)
    }
  );

  next();
};

export default queryParameterProcessorMiddleware;

