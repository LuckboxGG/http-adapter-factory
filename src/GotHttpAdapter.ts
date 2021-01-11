import got, {
  HTTPError,
  RequestError,
  OptionsOfUnknownResponseBody,
  Response as GotResponse,
} from 'got';
import * as qs from 'qs';

import HttpStatusCodeError from './errors/HttpStatusCodeError';
import HttpRequestError, { Request } from './errors/HttpRequestError';
import HttpGenericError from './errors/HttpGenericError';
import HttpAdapter, {
  SearchParams,
  Headers,
  CustomGetOptions,
  CustomPostOptions,
  AnyRequestOptions,
  FullResponse,
  ConstructorParams,
  ArrayFormats,
  Body,
  ContentTypes,
  DEFAULTS,
} from './HttpAdapter';

class GotHttpAdapter implements HttpAdapter {
  private readonly timeout: number;

  constructor(params: ConstructorParams = {}) {
    this.timeout = params.timeout ?? DEFAULTS.TIMEOUT;
  }

  async get<Response>(url: string, params: SearchParams = {}, headers: Headers = {}, opts: CustomGetOptions = {}): Promise<Response | FullResponse<Response>> {
    let urlToRequest = url;

    if (Object.keys(params).length > 0) {
      urlToRequest += qs.stringify(params, {
        arrayFormat: opts.arrayFormat ?? ArrayFormats.Brackets,
        encode: false,
        addQueryPrefix: true,
      });
    }

    try {
      const response = await got.get(urlToRequest, this.getCommonOpts(headers, opts)) as GotResponse<Response>;

      return this.prepareResponse(response, opts);
    } catch (err) {
      const request = {
        url: urlToRequest,
        method: 'GET',
        headers,
      };

      this.handleError(err, request);
    }
  }

  async post<Response>(url: string, body: Body = {}, headers: Headers = {}, opts: CustomPostOptions = {}): Promise<Response | FullResponse<Response>> {
    const contentType = opts.contentType ?? DEFAULTS.CONTENT_TYPE;

    try {
      const response = await got.post(url, {
        ...this.getCommonOpts(headers, opts),
        [contentType === ContentTypes.JSON ? 'json' : 'form']: body,
      }) as GotResponse<Response>;

      return this.prepareResponse(response, opts);
    } catch (err) {
      const request = {
        url,
        method: 'POST',
        headers,
        body,
      };

      this.handleError(err, request);
    }
  }

  private getCommonOpts(headers: Headers, opts: AnyRequestOptions) {
    const parseJSON = (opts.parseJSON ?? DEFAULTS.PARSE_JSON);

    return {
      headers,
      responseType: parseJSON ? 'json' : 'text',
      timeout: this.timeout,
      resolveBodyOnly: false,
      retry: 0,
    } as OptionsOfUnknownResponseBody;
  }

  private prepareResponse<Response>(response: GotResponse<Response>, opts: AnyRequestOptions) {
    if (opts.resolveFullResponse) {
      return {
        body: response.body,
        headers: response.headers,
      };
    }

    return response.body;
  }

  private handleError(err: Error, request: Request): never {
    if (err instanceof HTTPError) {
      throw new HttpStatusCodeError({
        message: err.message,
        statusCode: err.response.statusCode,
      });
    }

    if (err instanceof RequestError && err.name === 'RequestError') {
      throw new HttpRequestError({
        message: err.message,
        request,
      });
    }

    throw new HttpGenericError({
      message: err.message,
      originalError: err,
    });
  }
}

export default GotHttpAdapter;
