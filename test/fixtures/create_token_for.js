function createTokenFor(request) {
  const defaultExpiryPeriod = 10000;
  return {
    createdBy: request.content.idData.createdBy,
    validBy: Date.now() + defaultExpiryPeriod
  };
}

export default createTokenFor;
