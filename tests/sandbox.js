'use strict';
const nearAPI = require('near-api-js');
const BN = require('bn.js');
const fs = require('fs').promises;
const assert = require('assert').strict;

const config = {
  networkId: 'sandbox',
  nodeUrl: 'http://0.0.0.0:3030',
  keyPath: '/tmp/near-sandbox/validator_key.json',
  contractPath: './target/wasm32-unknown-unknown/release/nearcrowd.wasm',
  amount: new BN('10000000000000000000000000', 10), // 25 digits
  masterId: 'test.near',
  contractId: 'contract.test.near',
  aliceId: 'alice.test.near',
};

const methods = {
  viewMethods: ['get_account_stats'],
  changeMethods: ['new'],
};

let near;
let masterAccount;

const initNear = async () => {
  const keyFile = require(config.keyPath);
  const privKey = nearAPI.utils.KeyPair.fromString(keyFile.secret_key);
  const pubKey = nearAPI.utils.PublicKey.fromString(keyFile.public_key);

  const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
  keyStore.setKey(config.networkId, config.masterId, privKey);

  near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    networkId: config.networkId,
    nodeUrl: config.nodeUrl,
  });

  masterAccount = new nearAPI.Account(near.connection, config.masterId);

  // Create test accounts.
  try {
    await masterAccount.createAccount(config.aliceId, pubKey, config.amount);
    await masterAccount.createAccount(config.contractId, pubKey, config.amount);
  } catch (error) {
    console.log("It's okay: " + error.message);
  }

  keyStore.setKey(config.networkId, config.aliceId, privKey);
  keyStore.setKey(config.networkId, config.contractId, privKey);

  // Deploy the contract.
  const wasm = await fs.readFile(config.contractPath);
  const account = new nearAPI.Account(near.connection, config.contractId);
  await account.deployContract(wasm);

  // Initialize the contract.
  const contract = new nearAPI.Contract(account, config.contractId, methods);
  try {
    await contract.new({ args: {} });
  } catch {
    console.log("It's okay if contract has already been initialized");
  }
};

async function test() {
  const alice = new nearAPI.Account(near.connection, config.aliceId);
  const aliceContract = new nearAPI.Contract(alice, config.contractId, methods);

  const stats = await aliceContract.get_account_stats({
    account_id: config.contractId,
  });
  assert.deepEqual(stats, { balance: '0', successful: 0, failed: 0 });
}

(async function () {
  console.log('Initialize NEAR sandbox...');
  await initNear();

  console.log('Start tests...');
  await test();

  console.log('Done.');
})();
