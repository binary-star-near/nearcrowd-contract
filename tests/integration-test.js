'use strict';
const assert = require('assert').strict;
const config = require('./sandbox-init').config;

describe('Anyone', function () {
  it('should get an account statistic (smoke test)', async () => {
    const stats = await global.bobContract.get_account_stats({
      account_id: config.contractId,
    });
    assert.deepEqual(stats, { balance: '0', successful: 0, failed: 0 });
  });
});

describe('Admin', function () {
  this.timeout(5000);

  before('should add a taskset', async () => {
    await assert.doesNotReject(async () => {
      await global.adminContract.add_taskset({
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
      await global.adminContract.add_tasks({
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
      await global.adminContract.add_tasks({
        args: {
          task_ordinal: 1,
          hashes: ['12345678901234567890123456789002'.split('').map(Number)],
        },
      });
    });
  });

  it('should update taskset prices', async () => {
    await assert.doesNotReject(async () => {
      await global.adminContract.update_taskset_prices({
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
      await global.adminContract.update_mtasks_per_second({
        args: {
          task_ordinal: 0,
          mtasks_per_second: '101',
        },
      });
    });
  });

  it('should be able to manage user accounts', async () => {
    await assert.doesNotReject(async () => {
      await global.adminContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });
});

describe('Unregistered User', async function () {
  this.timeout(5000);

  it('should NOT add a taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.add_taskset({
        args: {
          ordinal: 0,
          max_price: '135000000000000000000000',
          min_price: '125000000000000000000000',
          mtasks_per_second: '100',
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.add_taskset({
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
      await global.aliceContract.add_tasks({
        args: {
          task_ordinal: 1,
          hashes: ['12345678901234567890123456789002'.split('').map(Number)],
        },
      });
    });
  });

  it('should NOT update a taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.update_taskset_prices({
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
      await global.aliceContract.update_mtasks_per_second({
        args: {
          task_ordinal: 1,
          mtasks_per_second: '102',
        },
      });
    });
  });

  it('can NOT whitelist accounts', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('can NOT ban accounts', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('should NOT be able to get assigned to a taskset', async function () {
    await assert.rejects(async () => {
      await global.aliceContract.change_taskset({
        args: {
          new_task_ord: 1,
        },
      });
    });
  });
});

describe('Registered User', async function () {
  this.timeout(5000);

  before(async function () {
    this.timeout(10000);

    await assert.doesNotReject(async () => {
      await global.adminContract.add_taskset({
        args: {
          ordinal: 2, // index of taskset
          max_price: '135000000000000000000000', // 0.135 N
          min_price: '125000000000000000000000', // 0.125 N,
          mtasks_per_second: '100', // 1 task per 100 seconds
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.add_tasks({
        args: {
          task_ordinal: 2,
          hashes: [
            '12345678901234567890123456789000'.split('').map(Number),
            '12345678901234567890123456789001'.split('').map(Number),
          ],
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('should NOT add a taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.add_taskset({
        args: {
          ordinal: 1,
          max_price: '135000000000000000000000',
          min_price: '125000000000000000000000',
          mtasks_per_second: '100',
        },
      });
    });
  });

  it('should NOT add a task into a taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.add_tasks({
        args: {
          task_ordinal: 2,
          hashes: ['12345678901234567890123456789002'.split('').map(Number)],
        },
      });
    });
  });

  it('should NOT update a taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.update_taskset_prices({
        args: {
          task_ordinal: 2,
          new_min_price: '126000000000000000000000',
          new_max_price: '136000000000000000000000',
        },
      });
    });
  });

  it('should NOT update tasks per second', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.update_mtasks_per_second({
        args: {
          task_ordinal: 2,
          mtasks_per_second: '102',
        },
      });
    });
  });

  it('can NOT whitelist accounts', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('can NOT ban accounts', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });

  it('should be able to get assigned to a taskset', async () => {
    await assert.doesNotReject(async () => {
      await global.aliceContract.change_taskset({
        args: {
          new_task_ord: 2,
        },
      });
    });
  });

  it('should NOT apply for an assignment in other taskset', async () => {
    await assert.rejects(async () => {
      await global.aliceContract.apply_for_assignment({
        args: {
          task_ordinal: 1,
        },
      });
    });
  });

  it('should apply for an assignment', async () => {
    await assert.doesNotReject(async () => {
      await global.aliceContract.apply_for_assignment({
        args: {
          task_ordinal: 2,
        },
      });

      // TODO: rejects(aliceContract.return_assignment()) within 5 minutes
    });
  });

  it('should NOT claim an assignment with incorrect bid', async () => {
    // TODO: doesNotReject(aliceContract.apply_for_assignment(task_ord: 2))
    const state = await global.aliceContract.get_account_state({
      task_ordinal: 2,
      account_id: config.aliceId,
    });

    assert.deepEqual(state, {
      WaitsForAssignment: {
        bid: '135000000000000000000000',
        time_left: '0',
      },
    });

    await assert.rejects(async () => {
      const result = await global.aliceContract.claim_assignment({
        args: {
          task_ordinal: 2,
          bid: state.WaitsForAssignment.bid + '1',
        },
      });

      assert.equal(result, true);
    });
  });

  it('should claim an assignment', async () => {
    const state = await global.aliceContract.get_account_state({
      task_ordinal: 2,
      account_id: config.aliceId,
    });

    assert.deepEqual(state, {
      WaitsForAssignment: {
        bid: '135000000000000000000000',
        time_left: '0',
      },
    });

    await assert.doesNotReject(async () => {
      const result = await global.aliceContract.claim_assignment({
        args: {
          task_ordinal: 2,
          bid: state.WaitsForAssignment.bid,
        },
      });

      assert.equal(result, false);
    });
  });

  after(async () => {
    await assert.doesNotReject(async () => {
      await global.adminContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });
});

describe('Anyone', async function () {
  this.timeout(3000);

  before(async function () {
    this.timeout(10000);

    await assert.doesNotReject(async () => {
      await global.adminContract.add_taskset({
        args: {
          ordinal: 2, // index of taskset
          max_price: '135000000000000000000000', // 0.135 N
          min_price: '125000000000000000000000', // 0.125 N,
          mtasks_per_second: '100', // 1 task per 100 seconds
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.add_tasks({
        args: {
          task_ordinal: 2,
          hashes: [
            '12345678901234567890123456789000'.split('').map(Number),
            '12345678901234567890123456789001'.split('').map(Number),
          ],
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.adminContract.whitelist_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });

    await assert.doesNotReject(async () => {
      await global.aliceContract.change_taskset({
        args: {
          new_task_ord: 2,
        },
      });
    });
  });

  it('should check whether any account is registered', async () => {
    const result = await global.bobContract.is_account_whitelisted({
      account_id: config.aliceId,
    });
    assert.equal(result, true);
  });

  it('should check a current taskset of any registered user', async () => {
    const result = await global.bobContract.get_current_taskset({
      account_id: config.aliceId,
    });
    assert.equal(result, 2);
  });

  it('should check a current task assignment of any registered user', async () => {
    const result = await global.bobContract.get_current_assignment({
      task_ordinal: 2,
      account_id: config.aliceId,
    });
    assert.equal(result, null);
  });

  it('should get any account statistic', async () => {
    const stats = await global.bobContract.get_account_stats({
      account_id: config.aliceId,
    });
    assert.deepEqual(stats, { balance: '0', successful: 0, failed: 0 });
  });

  it('should get task execution state of any user', async () => {
    const state = await global.aliceContract.get_account_state({
      task_ordinal: 2,
      account_id: config.aliceId,
    });

    assert.deepEqual(state, 'Idle');
  });

  it('should get any taskset state', async () => {
    const state = await global.aliceContract.get_taskset_state({
      task_ordinal: 2,
    });

    assert.deepEqual(state, {
      next_price: '135000000000000000000000',
      wait_time: '10000000000',
      num_unassigned: '2',
      num_reviews: '0',
    });
  });

  after(async () => {
    await assert.doesNotReject(async () => {
      await global.adminContract.ban_account({
        args: {
          account_id: config.aliceId,
        },
      });
    });
  });
});
