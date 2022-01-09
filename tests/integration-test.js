'use strict';
const nearAPI = require('near-api-js');
const BN = require('bn.js');
const fs = require('fs').promises;
const assert = require('assert').strict;

process.env.NEAR_NO_LOGS = true;

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
    'whitelist_account',
    'ban_account',
    'approve_solution',
    'change_taskset',
  ],
};

// Global NEAR connection.
let near;

before('Initialize NEAR sandbox', async function () {
  // 10 seconds at most for test execution.
  this.timeout(20000);

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

  let masterAccount = new nearAPI.Account(near.connection, config.masterId);

  // Create test accounts.
  await masterAccount.createAccount(config.aliceId, pubKey, config.amount);
  await masterAccount.createAccount(config.contractId, pubKey, config.amount);
  keyStore.setKey(config.networkId, config.aliceId, privKey);
  keyStore.setKey(config.networkId, config.contractId, privKey);

  // Deploy the contract.
  const wasm = await fs.readFile(config.contractPath);
  const account = new nearAPI.Account(near.connection, config.contractId);
  await account.deployContract(wasm);

  // Initialize the contract.
  const contract = new nearAPI.Contract(account, config.contractId, methods);
  await contract.new({ args: {} });
});

describe('Anyone', async () => {
  it('should get an account statistic', async () => {
    const user = new nearAPI.Account(near.connection, config.aliceId);
    const userContract = new nearAPI.Contract(user, config.contractId, methods);
    const stats = await userContract.get_account_stats({
      account_id: config.contractId,
    });
    assert.deepEqual(stats, { balance: '0', successful: 0, failed: 0 });
  });
});

describe('Admin', async function () {
  let adminContract;

  // 6 seconds at most for execution of each test case (instead of 2).
  this.timeout(6000);

  before('should add a taskset', async () => {
    const admin = new nearAPI.Account(near.connection, config.contractId);
    adminContract = new nearAPI.Contract(admin, config.contractId, methods);

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
  });

  it('should add a task into a taskset', async () => {
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
  });

  it('should NOT add a task into a non-existent taskset', async () => {
    await assert.rejects(async () => {
      await adminContract.add_tasks({
        args: {
          task_ordinal: 1,
          hashes: ['12345678901234567890123456789002'.split('').map(Number)],
        },
      });
    });
  });

  it('should update taskset prices', async () => {
    await assert.doesNotReject(async () => {
      await adminContract.update_taskset_prices({
        args: {
          task_ordinal: 0,
          new_min_price: '126000000000000000000000',
          new_max_price: '136000000000000000000000',
        },
      });
    });
  });

  it('should update tasks per second', async () => {
    await assert.doesNotReject(async () => {
      await adminContract.update_mtasks_per_second({
        args: {
          task_ordinal: 0,
          mtasks_per_second: '101',
        },
      });
    });
  });

  it('should be able to manage user accounts', async () => {
    await assert.doesNotReject(async () => {
      await adminContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await adminContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });
});

describe('User', async function () {
  let adminContract;
  let aliceContract;

  // 5 seconds at most for execution of each test case (instead of 2).
  this.timeout(5000);

  before('should NOT add a taskset', async () => {
    const admin = new nearAPI.Account(near.connection, config.contractId);
    const alice = new nearAPI.Account(near.connection, config.aliceId);
    adminContract = new nearAPI.Contract(admin, config.contractId, methods);
    aliceContract = new nearAPI.Contract(alice, config.contractId, methods);

    await assert.rejects(async () => {
      await aliceContract.add_taskset({
        args: {
          ordinal: 0,
          max_price: '135000000000000000000000',
          min_price: '125000000000000000000000',
          mtasks_per_second: '100',
        },
      });
    });

    await assert.doesNotReject(async () => {
      await adminContract.add_taskset({
        args: {
          ordinal: 1, // index of taskset
          max_price: '135000000000000000000000', // 0.135 N
          min_price: '125000000000000000000000', // 0.125 N,
          mtasks_per_second: '100', // 1 task per 100 seconds
        },
      });
    });
  });

  it('should NOT add a task into a taskset', async () => {
    await assert.rejects(async () => {
      await aliceContract.add_tasks({
        args: {
          task_ordinal: 1,
          hashes: ['12345678901234567890123456789002'.split('').map(Number)],
        },
      });
    });
  });

  it('should NOT update a taskset', async () => {
    await assert.rejects(async () => {
      await aliceContract.update_taskset_prices({
        args: {
          task_ordinal: 1,
          new_min_price: '126000000000000000000000',
          new_max_price: '136000000000000000000000',
        },
      });
    });
  });

  it('should NOT update tasks per second', async () => {
    await assert.rejects(async () => {
      await aliceContract.update_mtasks_per_second({
        args: {
          task_ordinal: 1,
          mtasks_per_second: '102',
        },
      });
    });
  });

  it('can NOT whitelist accounts', async () => {
    await assert.rejects(async () => {
      await aliceContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('can NOT ban accounts', async () => {
    await assert.rejects(async () => {
      await aliceContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('should be able to get assigned to a taskset', async function () {
    this.timeout(15000);

    await assert.rejects(async () => {
      await aliceContract.change_taskset({
        args: {
          new_task_ord: 1,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await adminContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await aliceContract.change_taskset({
        args: {
          new_task_ord: 1,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await adminContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });

    await assert.rejects(async () => {
      await aliceContract.change_taskset({
        args: {
          new_task_ord: 1,
        },
      });
    });
  });
});

after('Remove test accounts', async function () {
  // Setting 10 seconds for the test execution (instead of 2 seconds).
  this.timeout(10000);

  const alice = new nearAPI.Account(near.connection, config.aliceId);
  const contract = new nearAPI.Account(near.connection, config.contractId);

  await alice.deleteAccount(config.masterId);
  await contract.deleteAccount(config.masterId);
});
