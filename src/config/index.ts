import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { LogLevel } from 'typescript-logging';
import { Log4TSProvider } from 'typescript-logging-log4ts-style';

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
  SECURE_RELAY_MESSAGE_DELIVERER_BASE_URL,
  SECURE_RELAY_MESSAGE_DELIVERER_SEND
} = process.env;
