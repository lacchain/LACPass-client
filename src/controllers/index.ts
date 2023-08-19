import { DidLac1AttributeController } from './did-lac1/attribute.controller';
import { DidLac1Controller } from './did-lac1/did.controller';
import { ManagerController } from './manager-lac1/manager.controller';
// eslint-disable-next-line max-len
import { VerifiableCredentialsController } from './verifiable-credentials/verifiable.credentials.controller';

export const controllers = [
  DidLac1Controller,
  DidLac1AttributeController,
  ManagerController,
  VerifiableCredentialsController
];
