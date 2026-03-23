const hre = require("hardhat");

async function main() {
  console.log("Deploying Voting contract...");

  // Get the contract factory
  const Voting = await hre.ethers.getContractFactory("Voting");
  
  // Deploy without constructor arguments (for string-based voting)
  const voting = await Voting.deploy();
  
  // Wait for deployment to finish
  await voting.waitForDeployment();
  
  const deployedAddress = await voting.getAddress();
  
  console.log("\n✅ Voting contract deployed successfully!");
  console.log(`📍 Contract Address: ${deployedAddress}`);
  console.log("\nUpdate your contract.js with:");
  console.log(`const contractAddress = "${deployedAddress}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
