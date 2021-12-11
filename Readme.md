# gnosis-contribution-snapshot
Extract transactions sent to a Gnosis Safe.

> Snapshots ETH contributions to a Gnosis Safe

## Environment variables
The following values can be used to test provider and operation. The safe is from the [$ROSS](https://freerossdao.com/). 
```sh
NODE_ENV=development
# Infura Provider 
PROVIDER_ENDPOINT=
SAFE_ADDRESS=0xc102d2544a7029f7BA04BeB133dEADaA57fDF6b4
SAFE_DEPLOYED_IN_BLOCK=13724221
AUCTION_ENDED_IN_BLOCK=13770208
MERKLE_DISTRIBUTOR=false
```

## Build, Run
To extract contribution transfer amounts for an auction which will distribute the contributions on a pro-rate basis, then increasing the `BLOCK_PER_CHUNK` to a larger value like 100 will speed up the extraction. However, for distributions where block number or order is important, such as a bonding curve, then set the `BLOCK_PER_CHUNK` to 1.
```
git clone https://github.com/atsignhandle/gnosis-safe-contribution-snapshot
yarn install && yarn build
yarn run start
```
Or during development or edits.
```sh
ts-node ./node_modules/.bin/ts-node ./src/index.ts
```

### Notes

* not perfectly solid-state. If it crashes, run it from the beginning.
* snapshot.csv is exported by default
* snapshot.json is exported if you set the env MERKLE_DISTRIBUTOR_EXPORT to true

### Attribution
[zencephalon](https://github.com/zencephalon)
