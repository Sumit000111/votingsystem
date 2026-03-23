async function main() {
  console.log("Deploying Voting contract...");
  
  const Voting = await ethers.getContractFactory("Voting");
  console.log("Contract factory loaded");
  
  const voting = await Voting.deploy(3); // 3 candidates
  
  // wait for deployment
  await voting.waitForDeployment();

  // ✅ CORRECT WAY (ethers v6)
  const address = await voting.getAddress();

  console.log("✓ Voting contract deployed to:", address);
}

main()
  .then(() => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });