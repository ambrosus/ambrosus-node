import pkPair from './pk_pair';

const createAccountRequest = (fields) => ({
  content: {
    idData: {
      createdBy: pkPair.address,
      timestamp: Date.now(),
      ...fields
    }
  }
});

const accountWithSecret = {
  address: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616',
  secret: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616f585cA8DFD95a476AB5D616'
};

const account = {
  address: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616'
};

export {createAccountRequest, accountWithSecret, account};

