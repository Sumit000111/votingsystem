require('dotenv').config();
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

async function checkTx() {
  const txHash = '0xdae11a48dd6961494de42f21ee58e5e03616c40ba10b58479fa0d3274610169c';
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.log("Transaction not found on ledger!");
  } else {
    console.log(`Transaction found! Block: ${receipt.blockNumber}, To: ${receipt.to}`);
    console.log(`Logs: ${receipt.logs.length}`);
  }
}
checkTx();
