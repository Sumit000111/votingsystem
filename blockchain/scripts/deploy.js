/**
 * Deploys the Voting contract and hands the deployment to the backend.
 *
 *   npx hardhat run scripts/deploy.js --network localhost
 *
 * Writes:
 *   backend/blockchain/deployment.json  – address + deploy block (read by the API)
 *   backend/blockchain/abi/Voting.json  – contract ABI (committed)
 *   blockchain/deployments/<network>.json
 */
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

const BACKEND_CHAIN_DIR = path.join(__dirname, '..', '..', 'backend', 'blockchain');

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  const electionName = process.env.ELECTION_NAME || 'General Election 2026';
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log(`Deploying Voting to "${hre.network.name}" (chainId ${chainId}) from ${deployer.address}`);

  const Voting = await hre.ethers.getContractFactory('Voting');
  const voting = await Voting.deploy(electionName);
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  const deployTx = voting.deploymentTransaction();
  const receipt = await deployTx.wait();

  const deployment = {
    network: hre.network.name,
    chainId: Number(chainId),
    address,
    deployer: deployer.address,
    deployTx: deployTx.hash,
    deployBlock: receipt.blockNumber,
    electionName,
    deployedAt: new Date().toISOString(),
  };

  const { abi } = await hre.artifacts.readArtifact('Voting');

  writeJson(path.join(__dirname, '..', 'deployments', `${hre.network.name}.json`), { ...deployment, abi });
  writeJson(path.join(BACKEND_CHAIN_DIR, 'abi', 'Voting.json'), abi);
  if (hre.network.name !== 'hardhat') {
    writeJson(path.join(BACKEND_CHAIN_DIR, 'deployment.json'), deployment);
  }

  console.log(`\n✓ Voting deployed at ${address} (block ${receipt.blockNumber})`);
  console.log('✓ Deployment written to backend/blockchain/deployment.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
