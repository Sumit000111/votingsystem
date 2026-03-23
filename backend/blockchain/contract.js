const { ethers } = require("ethers");

// connect to local blockchain
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// use one private key from hardhat node (Account 0 from test mnemonic)
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const wallet = new ethers.Wallet(privateKey, provider);

// your deployed contract address
const contractAddress = process.env.CONTRACT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// ABI (minimal - for vote function that accepts string)
const abi = [
  "function vote(string memory candidate) returns (bool)",
  "function getVotes(string memory candidate) view returns (uint)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

module.exports = contract;