import { ConnectionOptions } from 'typeorm';
import {
  TYPEORM_HOST,
  TYPEORM_USERNAME,
  TYPEORM_PASSWORD,
  TYPEORM_DATABASE,
  TYPEORM_PORT,
  TYPEORM_SYNCHRONIZE,
  TYPEORM_LOGGING,
  TYPEORM_MIGRATIONS_RUN,
  PRODUCTION_ENV,
  TYPEORM_TYPE,
  IS_CLIENT_DEPENDENT_SERVICE,
  log4TSProvider
} from '@config';

import { Secp256k1Entity, DidEntity } from 'lacpass-identity';
import { ManagerEntity } from 'lacpass-chain-of-trust';

const log = log4TSProvider.getLogger('ormConfig');

const config: ConnectionOptions = {
  type: TYPEORM_TYPE as 'mysql' | 'postgres' | 'mongodb',
  host: TYPEORM_HOST,
  username: TYPEORM_USERNAME,
  password: TYPEORM_PASSWORD,
  database: TYPEORM_DATABASE,
  port: Number.parseInt(TYPEORM_PORT || '5432'),
  synchronize: TYPEORM_SYNCHRONIZE === 'true',
  logging: TYPEORM_LOGGING === 'true' ? ['error'] : false,
  entities: [
    PRODUCTION_ENV ? 'dist/src/entities/**/*.js' : 'src/entities/**/*.ts'
  ],
  migrations: [
    PRODUCTION_ENV
      ? 'dist/src/database/migrations/**/*.js'
      : 'src/database/migrations/**/*.ts'
  ],
  migrationsRun: TYPEORM_MIGRATIONS_RUN === 'true',
  cli: {
    migrationsDir: PRODUCTION_ENV
      ? 'dist/src/database/migrations'
      : 'src/database/migrations',
    entitiesDir: PRODUCTION_ENV ? 'dist/src/entities' : 'src/entities'
  }
};

if (IS_CLIENT_DEPENDENT_SERVICE !== 'true') {
  log.info('Importing entities from external components');
  config.entities?.push(DidEntity);
  // config.entities?.push(CoTDidEntity); // it refers to the same entity "Did"
  // but coming from a different package
  // As a rule, when two dependencies are using a same sub dependency,
  // from which we need to import their entities, then that sub dependecy
  // MUST have the same VERSION; this ensures that loaded entities don't differ.
  // in both dependencies.
  config.entities?.push(Secp256k1Entity);
  config.entities?.push(ManagerEntity);
} else {
  log.info('Initializing with local entities');
}

export = config;
