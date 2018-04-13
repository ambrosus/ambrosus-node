const cachePreventionMiddleware = (req, res, next) => {
  res.set('cache-control', 'no-store');
  next();
};

export default cachePreventionMiddleware;
