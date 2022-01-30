'use strict';
const { sandboxSetup } = require('./sandbox-init');

process.env.NEAR_NO_LOGS = 'defined';

function h(hex) {
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

describe('Seed', function () {
  this.timeout(15000);

  before(async () => {
    await sandboxSetup();
  });

  it('should create taskset 0 and 1 with a few tasks', async () => {
    let contract = global.adminContract;

    await contract.add_taskset({
      args: {
        ordinal: 0,
        max_price: '135000000000000000000000',
        min_price: '125000000000000000000000',
        mtasks_per_second: '100',
      },
    });

    await contract.add_taskset({
      args: {
        ordinal: 1,
        max_price: '135000000000000000000000',
        min_price: '125000000000000000000000',
        mtasks_per_second: '100',
      },
    });

    await contract.add_tasks({
      args: {
        task_ordinal: 0,
        hashes: [
          h('1122334455667788990011223344556677889900112233445566778899000001'),
          h('1122334455667788990011223344556677889900112233445566778899000002'),
        ],
      },
    });

    await contract.add_tasks({
      args: {
        task_ordinal: 1,
        hashes: [
          h('1122334455667788990011223344556677889900112233445566778899000003'),
          h('1122334455667788990011223344556677889900112233445566778899000004'),
        ],
      },
    });
  });
});
