import {InvalidParametersError} from '../errors/errors';

const castToNumberOrThrow = (input) => {
  const number = Number(input);
  if (isNaN(number)) {
    throw new InvalidParametersError('${input} is not a valid number');
  }
  return number;
};

const applyDecorators = (input, decorators) => {
  const extractDecoratorRegex = /^([^(\s]*)\((.+)\)$/gi;

  for (const key of Object.keys(input)) {
    const value = input[key];
    if ((typeof value) === 'object') {
      input[key] = applyDecorators(value, decorators);
    } else {
      const results = extractDecoratorRegex.exec(value);
      if (!results) {
        continue;
      }
      const [, decorator, decoratorParameter] = results;
      const decoratorFunc = decorators[decorator];
      if (decoratorFunc) {
        input[key] = decoratorFunc(decoratorParameter);
      }
    }
  }
  return input;
};

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

