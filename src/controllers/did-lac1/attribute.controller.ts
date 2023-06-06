import {
  JsonController,
  Post,
  BadRequestError,
  Body,
  UploadedFile,
  Delete
} from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../constants/errorMessages';
import { DidServiceLac1 } from '@services/external/did-lac/did-service';

@JsonController('/did/lac1/attribute')
@Service()
export class DidLac1AttributeController {
  constructor(private readonly didService: DidServiceLac1) {}

  @Post('/add/jwk-from-x509certificate')
  async addAttributeFromX509Certificate(
    @Body({ validate: true }) formData: any,
    @UploadedFile('x509Cert') x509Cert: Express.Multer.File
  ) {
    try {
      return this.didService.rawAddAttributeFromX509Certificate(
        formData,
        x509Cert
      );
    } catch (error: any) {
      throw new BadRequestError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('/revoke/jwk-from-x509certificate')
  async revokeAttributeFromX509Certificate(
    @Body({ validate: true }) formData: any,
    @UploadedFile('x509Cert') x509Cert: Express.Multer.File
  ) {
    try {
      return this.didService.rawRevokeAttributeFromX509Certificate(
        formData,
        x509Cert
      );
    } catch (error: any) {
      throw new BadRequestError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }
}
