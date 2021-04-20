import got, {
  HTTPError,
  RequestError,
  OptionsOfUnknownResponseBody,
  Response as GotResponse,
  ParseError as GotParseError,
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
import { IncomingHttpHeaders } from 'http';
import ParseError from './errors/ParseError';

class GotHttpAdapter implements HttpAdapter {
  private readonly timeout: number;

  constructor(params: ConstructorParams = {}) {
    this.timeout = params.timeout ?? DEFAULTS.TIMEOUT;
  }

  async get<Response>(url: string, params: SearchParams = {}, headers: Headers = {}, opts: CustomGetOptions = {}): Promise<Response | FullResponse<Response>> {
    let urlToRequest = url;

    if (Object.keys(params).length > 0) {
      const query = qs.stringify(params, {
        arrayFormat: opts.arrayFormat ?? ArrayFormats.Brackets,
        encode: true,
      });

      const delimiter = url.includes('?') ? '&' : '?';
      urlToRequest += delimiter + query;
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
        headers: this.stripUndefinedHeaders(response.headers),
      };
    }

    return response.body;
  }

  private stripUndefinedHeaders(headers: IncomingHttpHeaders) {
    type ExtractRecordValueType<T> = T extends Record<any, infer P> ? P : never;

    const cleansedHeaders: Headers = {};
    for (const key in headers) {
      if (headers[key] !== undefined) {
        cleansedHeaders[key] = headers[key] as ExtractRecordValueType<Headers>;
      }
    }

    return cleansedHeaders;
  }

  private handleError(err: Error, request: Request): never {
    if (err instanceof HTTPError) {
      throw new HttpStatusCodeError({
        message: err.message,
        statusCode: err.response.statusCode,
        body: err.response.body,
      });
    }

    if (err instanceof GotParseError) {
      throw new ParseError({
        message: err.message.split(/\sin\s+"?https?:\/{2}/i, 1)[0],
        responseBody: err.response.body,
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
