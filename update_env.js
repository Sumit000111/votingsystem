const fs = require('fs');
const txt = fs.readFileSync('deploy_output.txt', 'utf16le');
const match = txt.match(/0x[a-fA-F0-9]{40}/);
if(match) {
  let env = fs.readFileSync('backend/.env', 'utf8');
  env = env.replace(/CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/, 'CONTRACT_ADDRESS=' + match[0]);
  fs.writeFileSync('backend/.env', env);
  console.log('Updated to', match[0]);
} else {
  console.log('No match found');
}
