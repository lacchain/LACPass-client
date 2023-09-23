// eslint-disable-next-line max-len
import { VERIFICATION_REGISTRY_CONTRACT_ADDRESSES } from '@constants/verification.registry';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { LogLevel } from 'typescript-logging';
import { Log4TSProvider } from 'typescript-logging-log4ts-style';
import { version } from 'package.json';
import { isAddress } from 'ethers/lib/utils';
import { ProofOfExistenceMode } from '@constants/poe';

config({ path: `.env.${process.env.ENV || 'dev'}` });

export const log4TSProvider = Log4TSProvider.createProvider(
  'Log4ProviderClient' + randomUUID(),
  {
    level: LogLevel.Debug,
    groups: [
      {
        expression: new RegExp('.+')
      }
    ]
  }
);

const log = log4TSProvider.getLogger('lacpass-client-config');

log.info('LACPASS-CLIENT-VERSION', version);

export const getChainId = (): string => {
  if (!process.env.CHAIN_ID) {
    console.error('==> Please set CHAIN_ID in your .env');
    process.exit(1);
  }
  return process.env.CHAIN_ID;
};

export const CHAIN_ID = getChainId();

export const resolveProofOfExistenceMode = () => {
  const pOEValue = process.env.PROOF_OF_EXISTENCE_MODE;
  let mode: ProofOfExistenceMode;
  if (!pOEValue || pOEValue === 'ENABLED_NOT_THROWABLE') {
    mode = ProofOfExistenceMode.ENABLED_NOT_THROWABLE;
  } else if (pOEValue === 'STRICT') {
    mode = ProofOfExistenceMode.STRICT;
  } else if (pOEValue === 'DISABLED') {
    mode = ProofOfExistenceMode.DISABLED;
  } else {
    log.error(
      'Invalid option for PROOF_OF_EXISTENCE_MODE environment variable, found',
      pOEValue,
      '. Exiting ...'
    );
    process.exit(1);
  }
  log.info(`Setting Proof Existence Mode to', ${mode} for`, pOEValue);
  return mode;
};

export const PROOF_OF_EXISTENCE_MODE = resolveProofOfExistenceMode();

export const resolveVerificationRegistryContractAddress = (
  verificationRegistryContractAddress = process.env
    .VERIFICATION_REGISTRY_CONTRACT_ADDRESS
): string => {
  if (verificationRegistryContractAddress) {
    if (!isAddress(verificationRegistryContractAddress)) {
      log.error(
        'Specified VERIFICATION_REGISTRY_CONTRACT_ADDRESS',
        process.env.VERIFICATION_REGISTRY_CONTRACT_ADDRESS,
        'is not a valid address ... exiting'
      );
      process.exit(1); // exiting since this is a critical error
    }
    // TODO: validate just by making a call to contract to validate that's a correct one
    // could just verify against the desired version
    log.info(
      'Returning custom verification registry contract address',
      verificationRegistryContractAddress
    );
    return verificationRegistryContractAddress;
  }
  const wellKnownverificationRegistryContractAddress =
    VERIFICATION_REGISTRY_CONTRACT_ADDRESSES.get(CHAIN_ID);
  if (!wellKnownverificationRegistryContractAddress) {
    log.error(
      'Could not find well-known verification registry contract address for chain',
      CHAIN_ID
    );
    process.exit(1); // exiting since this is a critical error
  }
  log.info(
    'Returning default verification registry contract address',
    wellKnownverificationRegistryContractAddress
  );
  return wellKnownverificationRegistryContractAddress;
};

export const VERIFICATION_REGISTRY_CONTRACT_ADDRESS =
  resolveVerificationRegistryContractAddress();

export const getDidResolverUrl = (): string => {
  if (!process.env.DID_RESOLVER_URL) {
    console.error('==> Please set DID_RESOLVER_URL in your .env');
    process.exit(1);
  }
  return process.env.DID_RESOLVER_URL;
};

export const getSecureRelayServiceDid = (): string => {
  if (!process.env.SECURE_RELAY_SERVICE_DID) {
    console.error('==> Please set SECURE_RELAY_SERVICE_DID in your .env');
    process.exit(1);
  }
  return process.env.SECURE_RELAY_SERVICE_DID;
};

// If .env wasn't provided then exit
if (!process.env.PORT) {
  console.error('==> Please check your .env');
  process.exit(1);
}

export const DID_RESOLVER_URL = getDidResolverUrl();
export const SECURE_RELAY_SERVICE_DID = getSecureRelayServiceDid();

export const PRODUCTION_ENV = process.env.ENV === 'prod';
export const DEV_ENV = process.env.ENV === 'dev';
export const TESTING_ENV = process.env.ENV === 'test';
export const CI_ENV = process.env.ENV === 'ci';
export const JWT_SECRET_DEFAULT = 'some-secret-string-default';

export const {
  ENV,
  PORT,
  TYPEORM_PORT,
  TYPEORM_HOST,
  TYPEORM_TYPE,
  TYPEORM_USERNAME,
  TYPEORM_PASSWORD,
  TYPEORM_DATABASE,
  TYPEORM_SYNCHRONIZE,
  TYPEORM_LOGGING,
  TYPEORM_MIGRATIONS_RUN,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  JWT_SECRET,
  ACCESS_TOKEN_LIFE,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX_REQUESTS,
  AWS_ID,
  AWS_SECRET,
  AWS_REGION,
  AWS_S3_BUCKETNAME,
  AWS_SES_API_VERSION,
  DOCS_ENABLED,
  SENDGRID_API_USER,
  SENDGRID_API_KEY,
  IS_CLIENT_DEPENDENT_SERVICE,
  IDENTITY_MANAGER_BASE_URL,
  DID_LAC1_CONTROLLER,
  DID_LAC1_DECODE_DID,
  DID_LAC1,
  DID_LAC1_ADD_JWK_ATTR_FROM_X509_CERT,
  DID_LAC1_REVOKE_JWK_ATTR_FROM_X509_CERT,
  DID_LAC1_ADD_NEW_SECP256K1_ATTRIBUTE,
  DID_LAC1_ADD_NEW_ED25519_ATTRIBUTE,
  DID_LAC1_ADD_NEW_JWK_ATTRIBUTE,
  CHAIN_OF_TRUST_BASE_URL,
  COT_CREATE_MANAGER,
  COT_GET_MANAGER,
  KEY_MANAGER_BASE_URL,
  KEY_MANAGER_DID_JWT,
  KEY_MANAGER_DID_COMM_ENCRYPT,
  KEY_MANAGER_SECP256K1_PLAIN_MESSAGE_SIGN,
  KEY_MANAGER_SECP256K1_SIGN_LACCHAIN_TRANSACTION,
  SECURE_RELAY_MESSAGE_DELIVERER_BASE_URL,
  SECURE_RELAY_MESSAGE_DELIVERER_SEND
} = process.env;
