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
  changeMethods: [
    'new',
    'add_taskset',
    'add_tasks',
    'update_taskset_prices',
    'update_mtasks_per_second',
  ],
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

const setupAccounts = () => {
  const admin = new nearAPI.Account(near.connection, config.contractId);
  const adminContract = new nearAPI.Contract(admin, config.contractId, methods);
  const alice = new nearAPI.Account(near.connection, config.aliceId);
  const aliceContract = new nearAPI.Contract(alice, config.contractId, methods);

  return { adminContract, aliceContract };
};

async function testSimple() {
  const { _, aliceContract } = setupAccounts();

  const stats = await aliceContract.get_account_stats({
    account_id: config.contractId,
  });
  assert.deepEqual(stats, { balance: '0', successful: 0, failed: 0 });
}

const testTaskset = async () => {
  const { adminContract, aliceContract } = setupAccounts();

  // Administrator (owner) can add new tasksets.
  await assert.doesNotReject(async () => {
    await adminContract.add_taskset({
      args: {
        ordinal: 0, // index of taskset
        max_price: '135000000000000000000000', // 0.135 N
        min_price: '125000000000000000000000', // 0.125 N,
        mtasks_per_second: '100', // 1 task per 100 seconds
      },
    });
  });

  // Unprivileged user cannot add new tasksets.
  await assert.rejects(async () => {
    await aliceContract.add_taskset({
      args: {
        ordinal: 1, // index of taskset
        max_price: '135000000000000000000000', // 0.135 N
        min_price: '125000000000000000000000', // 0.125 N,
        mtasks_per_second: '100', // 1 task per 100 seconds
      },
    });
  });

  // Administrator (owner) can add new tasks.
  await assert.doesNotReject(async () => {
    await adminContract.add_tasks({
      args: {
        task_ordinal: 0, // index of taskset
        hashes: [
          '12345678901234567890123456789000'.split('').map(Number),
          '12345678901234567890123456789001'.split('').map(Number),
        ],
      },
    });
  });

  // Unprivileged user can't add new tasks.
  await assert.rejects(async () => {
    await aliceContract.add_tasks({
      args: {
        task_ordinal: 0,
        hashes: ['12345678901234567890123456789002'.split('').map(Number)],
      },
    });
  });

  // Non-existent index of a taskset.
  await assert.rejects(async () => {
    await adminContract.add_tasks({
      args: {
        task_ordinal: 1,
        hashes: ['12345678901234567890123456789002'.split('').map(Number)],
      },
    });
  });

  await assert.doesNotReject(async () => {
    await adminContract.update_taskset_prices({
      args: {
        task_ordinal: 0,
        new_min_price: '126000000000000000000000',
        new_max_price: '136000000000000000000000',
      },
    });
  });

  await assert.rejects(async () => {
    await aliceContract.update_taskset_prices({
      args: {
        task_ordinal: 0,
        new_min_price: '126000000000000000000000',
        new_max_price: '136000000000000000000000',
      },
    });
  });

  await assert.doesNotReject(async () => {
    await adminContract.update_mtasks_per_second({
      args: {
        task_ordinal: 0,
        mtasks_per_second: '101',
      },
    });
  });

  await assert.rejects(async () => {
    await aliceContract.update_mtasks_per_second({
      args: {
        task_ordinal: 0,
        mtasks_per_second: '102',
      },
    });
  });
};

(async function () {
  console.log('Initialize NEAR sandbox...');
  await initNear();

  console.log('Start tests...');
  await testSimple();
  await testTaskset();

  console.log('Done.');
})();
