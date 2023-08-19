import { ErrorsMessages } from '@constants/errorMessages';
import { InternalServerError } from 'routing-controllers';
import { Service } from 'typedi';
import fetch from 'node-fetch';

@Service()
export class DidResolver {
  private readonly resolverUrl: string;
  constructor(resolverUrl: string) {
    this.resolverUrl = resolverUrl.endsWith('/')
      ? resolverUrl.substring(0, resolverUrl.length - 1)
      : resolverUrl;
  }

  async resolve(did: string): Promise<any> {
    const result = await fetch(`${this.resolverUrl}/${did}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.RESOLVE_DID_ERROR);
    }
    return await result.json();
  }
}
