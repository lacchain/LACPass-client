import { JsonController, Post, BadRequestError } from 'routing-controllers';
import { Service } from 'typedi';
import { DidServiceWL } from '@services/external/did-service';
import { ErrorsMessages } from '@constants/errorMessages';
import { log4TSProvider } from '@config';

@JsonController('/did')
@Service()
export class DidController {
  private log = log4TSProvider.getLogger('didController');
  constructor(private readonly didService: DidServiceWL) {}

  @Post('/web-lac')
  async createDidWebLac(): Promise<any> {
    try {
      return this.didService.createDid();
    } catch (error: any) {
      this.log.info(error);
      throw new BadRequestError(
        error.detail ?? error.message ?? ErrorsMessages.INTERNAL_SERVER_ERROR
      );
    }
  }
}
