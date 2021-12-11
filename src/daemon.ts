import { ethers } from 'ethers';
import { formatEther } from '@ethersproject/units';
import { parse, stringify } from 'csv/sync';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PQueue } from './p-queue';
import { logger } from './utils';
import { environment, CEX_OVERRIDES } from './config';

const {
  NODE_ENV,
  PROVIDER_ENDPOINT,
  // SAFE_ADDRESS,
  // SAFE_DEPLOYED_IN_BLOCK,
  BLOCKS_PER_CHUNK,
  AUCTION_ENDED_IN_BLOCK,
  SNAPSHOT_FILENAME,
} = environment;

const SAFE_DEPLOYED_IN_BLOCK = 9360414;
const SAFE_ADDRESS = `0x6b175474e89094c44da98b954eedeac495271d0f`;
logger.info(`${NODE_ENV}, ${SAFE_ADDRESS}, ${SAFE_DEPLOYED_IN_BLOCK}`);
logger.info(
  `development and testing used DAI addresses, deployed version to use address of interest and block range of interest`,
);
logger.info(`with the final or current block watched`);

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_ENDPOINT as string);
const verbosity = environment.VERBOSITY;

const event_concurrency = 1;
const process_queue = new PQueue({ concurrency: event_concurrency });

const transfer_event = `event Transfer(address indexed src, address indexed dst, uint val)`;
const safe = new ethers.Contract(SAFE_ADDRESS, [transfer_event], provider);

type Snapshot = Record<string, ethers.BigNumber>;
let snapshot: Snapshot;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let block_height = 0;
const getNetworkStatus = async (provider: any) => {
  logger.info(`connected to:${PROVIDER_ENDPOINT}, network:${JSON.stringify(provider)}`);
  provider.getBlockNumber().then((blockNumber: any) => {
    logger.info(`current block number ${blockNumber}`);
    block_height = blockNumber;
  });
  provider.getGasPrice().then((gasPrice: any) => {
    const gas_in_ether = ethers.utils.formatEther(gasPrice);
    logger.info(`current gas price ${gas_in_ether.toString()}`);
  });
};

process.on('SIGINT', () => {
  logger.info('writing to snapshot.json');
  logger.info('received SIGINT, exiting gracefully');
  process.exit();
});

async function main() {
  logger.info(`parse the output and serialize, so that it can be looked up by another process`);
  await getNetworkStatus(provider);
  const filter = safe.filters.Transfer();
  block_height = Number(await provider.getBlockNumber());
  logger.info(
    `searching blocks ${Number(SAFE_DEPLOYED_IN_BLOCK)} ` +
      `through ${block_height} for ${transfer_event}`,
  );
  for (
    let i = Number(SAFE_DEPLOYED_IN_BLOCK);
    i < Number(block_height);
    i = i + Number(BLOCKS_PER_CHUNK)
  ) {
    const fromChunkNumber = i;
    const toBlock = Number(await provider.getBlockNumber());
    const toChunkNumber = Math.min(fromChunkNumber + BLOCKS_PER_CHUNK - 1, toBlock);
    const events = await safe.queryFilter(filter, fromChunkNumber, toChunkNumber);
    events.filter(Boolean).forEach((event: any) => {
      logger.info(
        `(${event.blockNumber}), ${ethers.utils.formatEther(
          ethers.BigNumber.from(event.args.val),
        )} ETH, ${event.args}, ${event.eventSignature}`,
      );
    });
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
