import {
  JsonController,
  Post,
  BadRequestError,
  Body,
  UploadedFile,
  InternalServerError
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
      const res = await this.verifiableCredential.send(formData, evidence);
      return res;
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
