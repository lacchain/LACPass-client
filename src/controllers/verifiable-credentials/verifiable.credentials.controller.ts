import {
  JsonController,
  Post,
  BadRequestError,
  Body,
  InternalServerError
} from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../constants/errorMessages';
// eslint-disable-next-line max-len
import { VerifiableCredentialService } from '@services/verifiable-credentials/verifiable.credentials.service';
import { DDCCToVCDTo } from '@dto/DDCCToVC';

/**
 * Allows to send a credential
 */
@JsonController('/verifiable-credential/ddcc')
@Service()
export class VerifiableCredentialsController {
  constructor(
    private readonly verifiableCredential: VerifiableCredentialService
  ) {}

  @Post('/send')
  async sendVC(@Body({ validate: true }) ddccToVcDto: DDCCToVCDTo) {
    try {
      return await this.verifiableCredential.transformAndSend(ddccToVcDto);
    } catch (error: any) {
      if (error.detail ?? error.message) {
        throw new BadRequestError(error.detail ?? error.message);
      }
      throw new InternalServerError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }
}
