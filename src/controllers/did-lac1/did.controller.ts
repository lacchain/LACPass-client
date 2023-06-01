import {
  JsonController,
  Post,
  BadRequestError,
  Get,
  Param
} from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorsMessages } from '@constants/errorMessages';
import { DidServiceLac1 } from '@services/external/did-lac/did-service';

@JsonController('/did/lac1')
@Service()
export class DidLac1Controller {
  constructor(private readonly didServiceWL: DidServiceLac1) {}

  @Post()
  async createDidLac1(): Promise<any> {
    try {
      return this.didServiceWL.createDid();
    } catch (error: any) {
      throw new BadRequestError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }
  @Get('/controller/:did')
  async getDidController(@Param('did') did: string): Promise<any> {
    return this.didServiceWL.getController(did);
  }
  @Get('/decode/:did')
  async getDidParams(@Param('did') did: string): Promise<any> {
    return this.didServiceWL.decodeDid(did);
  }
}
