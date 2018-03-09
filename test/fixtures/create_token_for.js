function createTokenFor(request) {
  const defaultExpiryPeriod = 10000;
  return {
    createdBy: request.createdBy,
    validBy: Date.now() + defaultExpiryPeriod
  };
}

export default createTokenFor;
