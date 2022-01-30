'use strict';
const nearAPI = require('near-api-js');
const BN = require('bn.js');
const fs = require('fs').promises;
const isReachable = require('is-reachable');

const config = {
  networkId: 'sandbox',
  nodeUrl: 'http://0.0.0.0:3030',
  keyPath: '/tmp/near-sandbox/validator_key.json',
  contractPath: './target/wasm32-unknown-unknown/release/nearcrowd.wasm',
  amount: new BN('10000000000000000000000000', 10), // 25 digits
  masterId: 'test.near',
  contractId: 'contract.test.near',
  aliceId: 'alice.test.near',
  bobId: 'bob.test.near', // always unregistered (banned) account
};

const methods = {
  viewMethods: [
    'is_account_whitelisted',
    'get_current_taskset',
    'get_current_assignment',
    'get_account_stats',
    'get_account_state',
    'get_taskset_state',
    'get_task_review_state',
  ],
  changeMethods: [
    'new',
    'add_taskset',
    'add_tasks',
    'update_taskset_prices',
    'update_mtasks_per_second',
    'whitelist_account',
    'ban_account',
    'approve_solution',
    'change_taskset',
    'apply_for_assignment',
    'claim_assignment',
    'return_assignment',
  ],
};

async function sandboxSetup() {
  if (!await isReachable(config.nodeUrl)) {
    throw new Error('Run sandbox first: `npm run sandbox`!');
  }

  const keyFile = require(config.keyPath);
  const privKey = nearAPI.utils.KeyPair.fromString(keyFile.secret_key);
  const pubKey = nearAPI.utils.PublicKey.fromString(keyFile.public_key);

  const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
  keyStore.setKey(config.networkId, config.masterId, privKey);

  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    networkId: config.networkId,
    nodeUrl: config.nodeUrl,
  });

  let masterAccount = new nearAPI.Account(near.connection, config.masterId);

  // Create test accounts.
  await masterAccount.createAccount(config.contractId, pubKey, config.amount);
  await masterAccount.createAccount(config.aliceId, pubKey, config.amount);
  await masterAccount.createAccount(config.bobId, pubKey, config.amount);
  keyStore.setKey(config.networkId, config.contractId, privKey);
  keyStore.setKey(config.networkId, config.aliceId, privKey);
  keyStore.setKey(config.networkId, config.bobId, privKey);

  // Deploy the contract.
  const wasm = await fs.readFile(config.contractPath);
  const account = new nearAPI.Account(near.connection, config.contractId);
  await account.deployContract(wasm);

  // Initialize the contract.
  const contract = new nearAPI.Contract(account, config.contractId, methods);
  await contract.new({ args: {} });

  // Initialize accounts connected to the contract for all test cases.
  const admin = new nearAPI.Account(near.connection, config.contractId);
  const alice = new nearAPI.Account(near.connection, config.aliceId);
  const bob = new nearAPI.Account(near.connection, config.bobId);
  const adminContract = new nearAPI.Contract(admin, config.contractId, methods);
  const aliceContract = new nearAPI.Contract(alice, config.contractId, methods);
  const bobContract = new nearAPI.Contract(bob, config.contractId, methods);

  // Setup a global test context.
  global.near = near;
  global.adminContract = adminContract;
  global.aliceContract = aliceContract;
  global.bobContract = bobContract;
}

async function sandboxTeardown() {
  const near = global.near;

  const alice = new nearAPI.Account(near.connection, config.aliceId);
  const bob = new nearAPI.Account(near.connection, config.bobId);
  const contract = new nearAPI.Account(near.connection, config.contractId);

  await alice.deleteAccount(config.masterId);
  await bob.deleteAccount(config.masterId);
  await contract.deleteAccount(config.masterId);
}

module.exports = { config, sandboxSetup, sandboxTeardown };

module.exports.mochaHooks = {
  beforeAll: async function () {
    this.timeout(15000);
    await sandboxSetup();
  },
  afterAll: async function () {
    this.timeout(10000);
    await sandboxTeardown();
  },
};
