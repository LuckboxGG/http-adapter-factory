import got, { HTTPError, ParseError as GotParseError, RequestError  } from 'got';
import ParseError from '../errors/ParseError';
import HttpGenericError from '../errors/HttpGenericError';
import HttpRequestError from '../errors/HttpRequestError';
import HttpStatusCodeError from '../errors/HttpStatusCodeError';

import GotHttpAdapter from '../GotHttpAdapter';
import { ArrayFormats, ContentTypes } from '../HttpAdapter';
import { produceFoolInstance } from './utils';

jest.mock('got');

const mockGot = got as jest.Mocked<typeof got>;

describe('GotHttpAdapter', () => {
  let httpAdapter: GotHttpAdapter;
  beforeAll(() => {
    const okResponse = {
      body: {
        data: null,
        error: null,
      },
      headers: {},
    };
    mockGot.get.mockResolvedValue(okResponse);
    mockGot.post.mockResolvedValue(okResponse);

    httpAdapter = new GotHttpAdapter();
  });

  afterEach(() => {
    mockGot.get.mockClear();
    mockGot.post.mockClear();
  });

  describe('get', () => {
    it('should use the user defined timeout if provided', async () => {
      const usedDefinedTimeout = 60000;
      const customHttpAdapter = new GotHttpAdapter({
        timeout: usedDefinedTimeout,
      });

      await customHttpAdapter.get('http://example.com');

      expect(mockGot.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: usedDefinedTimeout,
      }));
    });

    it('should use the default timeout if not provided explicitly', async () => {
      const customHttpAdapter = new GotHttpAdapter();
      await customHttpAdapter.get('http://example.com');

      expect(mockGot.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: 5000,
      }));
    });

    const searchParams = { a: [1, 2] };
    it.each([
      [undefined, 'a%5B%5D=1&a%5B%5D=2'],
      [ArrayFormats.Brackets, 'a%5B%5D=1&a%5B%5D=2'],
      [ArrayFormats.Comma, 'a=1%2C2'],
      [ArrayFormats.Indices, 'a%5B0%5D=1&a%5B1%5D=2'],
      [ArrayFormats.Repeat, 'a=1&a=2'],
    ])('should format the arrays in the query as requested [%s]', async (arrayFormat: ArrayFormats | undefined, expectedQuery: string) => {
      const url = 'http://example.com';
      await httpAdapter.get(url, searchParams, {}, { arrayFormat });
      expect(mockGot.get).toHaveBeenCalledWith(url + '?' + expectedQuery, expect.anything());
    });

    it('should correctly handle urls with provided query params', async () => {
      const urlWithQuery = 'http://example.com?bar=foo';
      await httpAdapter.get(urlWithQuery, {
        foo: 'bar',
      });

      expect(mockGot.get).toHaveBeenCalledWith(urlWithQuery + '&foo=bar', expect.anything());
    });

    it('should call the got.get method with correct args', async () => {
      const url = 'http://example.com';
      const headers = {
        'My-Header': 'value',
      };

      await httpAdapter.get(url, undefined, headers);

      expect(mockGot.get).toHaveBeenCalledWith(url, expect.objectContaining({
        headers,
        resolveBodyOnly: false,
        retry: 0,
      }));
    });

    it.each([
      [undefined, 'json'],
      [true, 'json'],
      [false, 'text'],
    ])('should call the got.post with correct responseType when passing parseJSON = %s', async (parseJSON: boolean | undefined, expectedResponseType: string) => {
      await httpAdapter.get('http://example.com', {}, undefined, {
        parseJSON,
      });

      expect(mockGot.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        responseType: expectedResponseType,
      }));
    });

    it('should return the body from the response', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.get.mockResolvedValue(response);

      const result = await httpAdapter.get('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.get.mockResolvedValue(response);

      const result = await httpAdapter.get('http://example.com', undefined, undefined, { resolveFullResponse: true });
      expect(result).toEqual(response);
    });

    it.each([
      429,
      401,
      404,
      500,
    ])('should throw HttpStatusCodeError[%s] when got throws HTTPError', async (statusCode: number) => {
      const httpError = produceFoolInstance(HTTPError, {
        message: 'Http Error',
        response: {
          statusCode,
        },
      });
      mockGot.get.mockRejectedValueOnce(httpError);

      let caughtErr;
      try {
        await httpAdapter.get('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpStatusCodeError);
      expect(caughtErr.getStatusCode()).toEqual(statusCode);
    });

    it('should throw HttpRequestError when got throws RequestError', async () => {
      const requestError = produceFoolInstance(RequestError);
      requestError.message = 'Request Error';
      requestError.name = 'RequestError';
      mockGot.get.mockRejectedValueOnce(requestError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.get(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpRequestError);
      expect(caughtErr.request).toEqual({
        url,
        method: 'GET',
        headers: {},
      });
    });

    it('should throw HttpGenericError when got throws subclass of RequestError', async () => {
      const timeoutError = produceFoolInstance(RequestError);
      timeoutError.message = 'Connection has timed out';
      timeoutError.name = 'TimeoutError';
      mockGot.get.mockRejectedValueOnce(timeoutError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.get(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpGenericError);
      expect(caughtErr.originalError).toEqual(timeoutError);
    });

    it('should throw ParseError when got throws ParseError', async () => {
      const parseError = produceFoolInstance(GotParseError, {
        message: 'Unexpected token < at position 10 in http://example.com',
        name: 'ParseError',
        response: {
          body: 'Invalid JSON',
        },
      });

      mockGot.post.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.post('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(ParseError);
      expect(caughtErr.message).toEqual('Unexpected token < at position 10');
    });
  });

  describe('post', () => {
    it('should use the user defined timeout if provided', async () => {
      const usedDefinedTimeout = 60000;
      const customHttpAdapter = new GotHttpAdapter({
        timeout: usedDefinedTimeout,
      });

      await customHttpAdapter.post('http://example.com');

      expect(mockGot.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: usedDefinedTimeout,
      }));
    });

    it('should use the default timeout if not provided explicitly', async () => {
      const customHttpAdapter = new GotHttpAdapter();

      await customHttpAdapter.post('http://example.com');

      expect(mockGot.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: 5000,
      }));
    });

    it('should call the got.post method with correct args', async () => {
      const url = 'http://example.com';
      const headers = {
        'My-Header': 'again-my-value',
      };
      const body = {};
      await httpAdapter.post(url, body, headers);

      expect(mockGot.post).toHaveBeenCalledWith(url, expect.objectContaining({
        headers,
        resolveBodyOnly: false,
        retry: 0,
      }));
    });

    it.each([
      [undefined, 'json'],
      [true, 'json'],
      [false, 'text'],
    ])('should call the got.post with correct responseType when passing parseJSON = %s', async (parseJSON: boolean | undefined, expectedResponseType: string) => {
      await httpAdapter.post('http://example.com', {}, undefined, {
        parseJSON,
      });

      expect(mockGot.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        responseType: expectedResponseType,
      }));
    });

    it.each([
      [undefined, 'json'],
      [ContentTypes.Form, 'form'],
      [ContentTypes.JSON, 'json'],
    ])('should call the got.post with correct key (form or json) when passing contentType = %s', async (contentType: ContentTypes | undefined, expectedKey: string) => {
      const body = {
        bar: 'foo',
      };
      await httpAdapter.post('http://example.com', body, undefined, {
        contentType,
      });

      expect(mockGot.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        [expectedKey]: body,
      }));
    });

    it('should return the body from the response', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.post.mockResolvedValue(response);

      const result = await httpAdapter.post('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.post.mockResolvedValue(response);

      const result = await httpAdapter.post('http://example.com', {}, {}, { resolveFullResponse: true });
      expect(result).toEqual(response);
    });

    it.each([
      429,
      401,
      404,
      500,
    ])('should throw HttpStatusCodeError[%s] when got throws HTTPError', async (statusCode: number) => {
      const httpError = produceFoolInstance(HTTPError, {
        message: 'Http Error',
        response: {
          statusCode,
        },
      });
      mockGot.post.mockRejectedValueOnce(httpError);

      let caughtErr;
      try {
        await httpAdapter.post('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpStatusCodeError);
      expect(caughtErr.getStatusCode()).toEqual(statusCode);
    });

    it('should throw HttpRequestError when got throws RequestError', async () => {
      const requestError = produceFoolInstance(RequestError, {
        message: 'Request Error',
        name: 'RequestError',
      });
      mockGot.post.mockRejectedValueOnce(requestError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.post(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpRequestError);
      expect(caughtErr.request).toEqual({
        url,
        method: 'POST',
        headers: {},
        body: {},
      });
    });

    it('should throw HttpGenericError when got throws subclass of RequestError', async () => {
      const unexpectedCloseError = produceFoolInstance(RequestError, {
        message: 'Connection has been closed unexpectedly',
        name: 'UnexpectedCloseError',
      });
      mockGot.post.mockRejectedValueOnce(unexpectedCloseError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.post(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpGenericError);
      expect(caughtErr.originalError).toEqual(unexpectedCloseError);
    });

    it('should throw ParseError when got throws ParseError', async () => {
      const parseError = produceFoolInstance(GotParseError, {
        message: 'Unexpected token < at position 10 in http://example.com',
        name: 'ParseError',
        response: {
          body: 'Invalid JSON',
        },
      });

      mockGot.post.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.post('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(ParseError);
      expect(caughtErr.message).toEqual('Unexpected token < at position 10');
    });
  });
});

