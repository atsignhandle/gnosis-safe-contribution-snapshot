import { ethers } from 'ethers';
import { formatEther } from '@ethersproject/units';
import { parse, stringify } from 'csv/sync';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PQueue } from './p-queue';
import { logger } from './utils';
import { environment, CEX_OVERRIDES } from './config';

const {
  NODE_ENV,
  VERBOSITY,
  PROVIDER_ENDPOINT,
  SAFE_ADDRESS,
  SAFE_DEPLOYED_IN_BLOCK,
  AUCTION_ENDED_IN_BLOCK,
  BLOCKS_PER_CHUNK,
  SNAPSHOT_FILENAME,
  NEXT_BLOCK_INFO,
} = environment;

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_ENDPOINT as string);
const verbosity = environment.VERBOSITY;
const event_concurrency = 1;
const process_queue = new PQueue({ concurrency: event_concurrency });

const safe = new ethers.Contract(
  SAFE_ADDRESS,
  [`event SafeReceived(address indexed sender, uint256 value)`],
  provider,
);

type Snapshot = Record<string, ethers.BigNumber>;
let snapshot: Snapshot;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readFromSnapshot(): Snapshot {
  if (!existsSync(SNAPSHOT_FILENAME)) return {};
  const data = parse(readFileSync(SNAPSHOT_FILENAME), { columns: true }) as {
    sender: string;
    value: string;
  }[];

  return data.reduce<Snapshot>((memo, { sender, value }) => {
    memo[sender] = ethers.BigNumber.from(value);
    return memo;
  }, {});
}

function writeToSnapshot(snapshot: Snapshot) {
  writeFileSync(
    SNAPSHOT_FILENAME,
    stringify(
      Object.keys(snapshot).map((sender) => ({ sender, value: snapshot[sender].toString() })),
      {
        header: true,
      },
    ),
  );
}

function getNextBlock() {
  if (!existsSync(NEXT_BLOCK_INFO)) return SAFE_DEPLOYED_IN_BLOCK;
  return JSON.parse(readFileSync(NEXT_BLOCK_INFO).toString()).next;
}

function setNextBlock(next: number) {
  writeFileSync(NEXT_BLOCK_INFO, JSON.stringify({ next }));
}

const getNetworkStatus = async (provider: any) => {
  verbosity
    ? logger.info(`Connected to:${PROVIDER_ENDPOINT}, Network:${JSON.stringify(provider)}`)
    : null;
  provider.getBlockNumber().then((blockNumber: any) => {
    logger.info(`Current block number:${blockNumber}`);
  });
  provider.getGasPrice().then((gasPrice: any) => {
    logger.info(`Current gas price:${formatEther(gasPrice)} ETH`);
  });
  logger.info(`queue concurrency:${event_concurrency}, block per chunk:${BLOCKS_PER_CHUNK}`);
};

process.on('SIGINT', () => {
  logger.info('writing to snapshot.csv');
  writeToSnapshot(snapshot);
  logger.info('received SIGINT, exiting gracefully');
  process.exit();
});

async function main() {
  snapshot = readFromSnapshot();
  verbosity ? logger.info(`Snapshot has ${Object.keys(snapshot).length} entries.`) : null;

  await getNetworkStatus(provider);

  const fromBlock = NODE_ENV.includes('development') ? 13729821 : getNextBlock();
  const toBlock = Number(AUCTION_ENDED_IN_BLOCK);

  verbosity ? logger.info(`Snapshotting from ${fromBlock} to ${toBlock}`) : null;
  const filter = safe.filters.SafeReceived();

  const handleContribution = (block: number, sender: string, value: ethers.BigNumber) => {
    logger.info(`(${block}) ${sender} sent ${formatEther(value)} ETH`);
    snapshot[sender] = (snapshot[sender] ?? ethers.BigNumber.from(0)).add(value);
  };

  let lastChunkNumber = 0;
  for (let i = fromBlock; i <= toBlock; i = i + BLOCKS_PER_CHUNK) {
    const fromChunkNumber = i;
    const nextChunkNumber = fromChunkNumber + 1;
    const toChunkNumber = Math.min(fromChunkNumber + BLOCKS_PER_CHUNK - 1, toBlock);

    try {
      const events = await safe.queryFilter(filter, fromChunkNumber, toChunkNumber);
      verbosity && events.length !== 0
        ? logger.info(
            `blocks ${fromChunkNumber} => ${toChunkNumber} ` + `contains ${events.length} events`,
          )
        : null;

      events.filter(Boolean).forEach((event: ethers.Event) => {
        if (!event.args?.sender || !event.args?.value) {
          logger.info(`Invalid event??`, event);
          return;
        }

        const sender = CEX_OVERRIDES[event.transactionHash] ?? (event.args.sender as string);
        const value = event.args.value as ethers.BigNumber;

        if (CEX_OVERRIDES[event.transactionHash]) {
          logger.info(
            `remapping tx ${event.transactionHash} for ${ethers.utils.formatEther(
              value,
            )} ETH from ${event.args.sender} to ${CEX_OVERRIDES[event.transactionHash]}`,
          );
        }

        process_queue.add(async () => await handleContribution(fromChunkNumber, sender, value));
        verbosity &&
          lastChunkNumber !== toChunkNumber &&
          logger.info(`setting next to ${toChunkNumber + 1}`);
        setNextBlock(toChunkNumber + 1);
        lastChunkNumber = toChunkNumber;
      });
      await sleep(2000);
    } catch (error) {
      logger.error(error);
      break;
    }
  }

  logger.info('writing to snapshot.csv');
  writeToSnapshot(snapshot);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
