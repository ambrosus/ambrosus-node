function createTokenFor(address) {
  const defaultExpiryPeriod = 10000;
  return {
    createdBy: address,
    validBy: Date.now() + defaultExpiryPeriod
  };
}

export default createTokenFor;
