'use strict';
const { sandboxSetup, config } = require('./sandbox-init');
const crypto = require('crypto');

process.env.NEAR_NO_LOGS = 'defined';

/**
 * Hash string to bytes array
 * @param hex {string}
 * @returns {number[]}
 */
function h(hex) {
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hashAndBytesArray = (s) => h(hash(s));

/**
 * Generates fake tasks (a simple metadata object) with image link.
 */
const generateFakeTask = (n) => ({
  img: `https://picsum.photos/id/${n}/2000`,
});

// Seed data
const tasks = Array(100).fill({}).map((_, i) => generateFakeTask(i));
const tasksets = [
  {
    ordinal: 0,
    hashes: tasks.slice(0, 51).map(task => {
      return hashAndBytesArray(JSON.stringify(task))
    })
  },
  {
    ordinal: 1,
    hashes: tasks.slice(51, 100).map(taskMetadata => {
      return hashAndBytesArray(JSON.stringify(taskMetadata))
    })
  }
]

describe('Seed', function () {
  this.timeout(15000);

  before(async () => {
    await sandboxSetup();
  });

  it('should create taskset 0 and 1 with a few tasks', async () => {
    let contract = global.adminContract;

    await contract.whitelist_account({
      args: {
        account_id: config.masterId,
      },
    });

    const addTasksetsActions = tasksets.map(taskset => {
      return contract.add_taskset({
        args: {
          ordinal: taskset.ordinal,
          max_price: '135000000000000000000000',
          min_price: '125000000000000000000000',
          mtasks_per_second: '100',
        }
      });
    });
    await Promise.all(addTasksetsActions);

    const addTasksActions = tasksets.map(taskset => {
      return contract.add_tasks({
        args: {
          task_ordinal: taskset.ordinal,
          hashes: taskset.hashes,
        }
      });
    });
    await Promise.all(addTasksActions);

    console.log('Whitelisted account: ', config.masterId);
    console.log('Added tasksets:', tasksets);
  });
});
