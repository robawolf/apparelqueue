/**
 * Type declarations for paapi5-nodejs-sdk
 * The SDK doesn't include TypeScript definitions, so we provide minimal types here
 */

declare module 'paapi5-nodejs-sdk' {
  export class ApiClient {
    static instance: ApiClient;
    accessKey: string;
    secretKey: string;
    host: string;
    region: string;
  }

  export class DefaultApi {
    getItems(request: GetItemsRequest): Promise<any>;
  }

  export class GetItemsRequest {
    PartnerTag: string;
    PartnerType: string;
    ItemIds: string[];
    Resources: string[];
  }

  export class GetItemsResponse {
    static constructFromObject(data: any): GetItemsResponse;
    Errors?: Array<{Code: string; Message: string}>;
    ItemsResult?: {
      Items?: Array<any>;
    };
  }
}
