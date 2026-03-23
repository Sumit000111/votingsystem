async function main(hre)  {
  console.log("Deploying...");
  const ethers = hre.ethers;
  const Factory = await ethers.getContractFactory("Voting");
  console.log("Factory:", Factory.name);
  const contract = await Factory.deploy(3);
  console.log("Deployed to:", contract.address || contract.target);
}

module.exports = main;
