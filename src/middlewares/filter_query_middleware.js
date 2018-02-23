import {put} from '../utils/dict_utils';

const filterQueryMiddleware = (allowedParametersList) => ((req, res, next) => {
  const filteredParams = Object
    .keys(req.query)
    .filter((key) => allowedParametersList.includes(key))
    .reduce(
      (ret, key) => put(ret, key, req.query[key]),
      {});

  req.query = filteredParams;
  next();
});

export default filterQueryMiddleware;

