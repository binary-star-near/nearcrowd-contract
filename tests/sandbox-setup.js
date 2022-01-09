const exec = require('child_process').exec;
const sleep = require('util').promisify(setTimeout);
const kill = require('tree-kill');

let sandbox;

const mochaGlobalSetup = async () => {
  console.log('Start sandbox...');
  sandbox = exec('npm run sandbox');
  await sleep(3000);
};

const mochaGlobalTeardown = async () => {
  console.log('Stop sandbox...');
  kill(sandbox.pid);
};

module.exports = { mochaGlobalSetup, mochaGlobalTeardown };
