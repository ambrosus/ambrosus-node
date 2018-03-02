const resetHistory = (...stubObjects) => {
  const resetStub = (stub) => stub.resetHistory();
  const resetStubObject = (stubObject) => Object.values(stubObject).forEach(resetStub);
  stubObjects.forEach(resetStubObject);
};

export default resetHistory;
