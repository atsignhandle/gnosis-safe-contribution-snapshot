import { config } from 'dotenv';
import { bool, cleanEnv, host, num, port, str, url } from 'envalid';

config();

export const environment = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production', 'staging'] }),
  VERBOSITY: bool({ default: true }),
  PROVIDER_ENDPOINT: str({
    default: 'http://127.0.0.1:8545',
  }),
  SAFE_ADDRESS: str(),
  SAFE_DEPLOYED_IN_BLOCK: num({ default: 13_724_221 }),
  AUCTION_ENDED_IN_BLOCK: num({ default: 13_770_208 }),
  BLOCKS_PER_CHUNK: num({ default: 1 }),
  SNAPSHOT_FILENAME: str({ default: 'snapshot.csv' }),
  NEXT_BLOCK_INFO: str({ default: 'next.json' }),
  MERKLE_DISTRIBUTOR: bool({ default: false }),
});

!environment.isProduction ? console.log(environment) : null;
