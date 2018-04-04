import {getTimestamp} from '../../src/utils/time_utils';

function createTokenFor(address) {
  const defaultExpiryPeriod = 10;
  return {
    createdBy: address,
    validBy: getTimestamp() + defaultExpiryPeriod
  };
}

export default createTokenFor;
