[![Contract](https://github.com/binary-star-near/nearcrowd-contract/actions/workflows/main.yml/badge.svg?event=push)](https://github.com/binary-star-near/nearcrowd-contract)

# NEAR Crowd

The source code of NEAR Crowd contract.

_Forked from the original version here: https://github.com/NEARCrowd/NEARCrowd_.

## Build

Add Rust `wasm32` target:
```bash
rustup target add wasm32-unknown-unknown
```
Build the contract:

```bash
cargo build --target wasm32-unknown-unknown --release
```

There is an `npm` script achieving effectively the same:

```bash
npm run build
```

_**Note**: release build is needed to minimize the wasm32 binary._
1. _`Cargo.toml` contains compile-time optimization options by size,_
2. _`.cargo/config` contains stripping flags `-C link-args=-s`,_
3. _`--release` enables release profile._

## Deployment

### On `sandbox`:

Install sandbox:

```bash
npm install -g near-sandbox
near-sandbox --home /tmp/near-sandbox init
near-sandbox --home /tmp/near-sandbox run
```

Deploy:

```bash
near deploy --wasmFile target/wasm32-unknown-unknown/release/nearcrowd.wasm --initFunction new --initArgs '{}' --accountId test.near --networkId sandbox --nodeUrl http://0.0.0.0:3030
```

### On `mainnet`:

```bash
near deploy --wasmFile target/wasm32-unknown-unknown/release/nearcrowd.wasm --initFunction new --initArgs '{}' --accountId=app.nearcrowd.near --networkId=mainnet --nodeUrl=https://rpc.mainnet.near.org

```
