import {
  JsonController,
  Post,
  BadRequestError,
  Body,
  UploadedFile
} from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../constants/errorMessages';
// eslint-disable-next-line max-len
import { VerifiableCredentialService } from '@services/verifiable-credentials/verifiable.credentials.service';

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
  async sendVerifiableCredential(
    @Body({ validate: true }) formData: any,
    @UploadedFile('qrCode') evidence: Express.Multer.File
  ) {
    try {
      return this.verifiableCredential.send(formData, evidence);
    } catch (error: any) {
      throw new BadRequestError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }
}
