import {createWeb3, DEFAULT_GAS} from '../utils/web3_tools';

let taskId;
const args = process.argv.slice(2);
const randomTransaction = async (web3) => {
  try {
    await web3.eth.sendTransaction({
      from: web3.eth.defaultAccount,
      to: args[1],
      value: Math.floor(Math.random() * 100),
      gas: DEFAULT_GAS
    });
    console.log('Transaction sent');
  } catch (err) {
    console.error(err);
  }
};

console.log('Connecting to AMB chain...');
createWeb3()
  .then(async (web3) => {
    console.log('Connected.');
    taskId = setInterval(() => randomTransaction(web3), args[0] * 1000);
  });

process.on('SIGINT', () => {
  if (taskId) {
    clearInterval(taskId);
  }
  process.exit();
});
