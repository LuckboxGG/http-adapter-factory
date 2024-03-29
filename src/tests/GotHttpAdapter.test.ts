import got, { HTTPError, ParseError as GotParseError, RequestError, TimeoutError  } from 'got';
import ParseError from '../errors/ParseError';
import HttpGenericError from '../errors/HttpGenericError';
import HttpRequestError from '../errors/HttpRequestError';
import HttpStatusCodeError from '../errors/HttpStatusCodeError';

import GotHttpAdapter from '../GotHttpAdapter';
import { ArrayFormats, ContentTypes } from '../HttpAdapter';
import { produceFoolInstance } from './utils';
import HttpTimeoutError from '../errors/HttpTimeoutError';

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
    mockGot.delete.mockResolvedValue(okResponse);
    mockGot.patch.mockResolvedValue(okResponse);
    mockGot.put.mockResolvedValue(okResponse);

    httpAdapter = new GotHttpAdapter();
  });

  afterEach(() => {
    mockGot.get.mockClear();
    mockGot.post.mockClear();
    mockGot.delete.mockClear();
    mockGot.patch.mockClear();
    mockGot.put.mockClear();
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
      mockGot.get.mockResolvedValueOnce(response);

      const result = await httpAdapter.get('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.get.mockResolvedValueOnce(response);

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
        message: 'Unexpected token < at position 10 in "http://example.com"',
        name: 'ParseError',
        response: {
          rawBody: Buffer.from('Invalid JSON'),
        },
      });

      mockGot.get.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.get('http://example.com');
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
      mockGot.post.mockResolvedValueOnce(response);

      const result = await httpAdapter.post('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.post.mockResolvedValueOnce(response);

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

    it('should throw HttpTimeoutError when got throws TimeoutError', async () => {
      const timeoutError = produceFoolInstance(TimeoutError, {
        message: 'Timeout Error',
        name: 'TimeoutError',
      });
      mockGot.post.mockRejectedValueOnce(timeoutError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.post(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpTimeoutError);
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
        message: 'Unexpected token < at position 10 in "http://example.com"',
        name: 'ParseError',
        response: {
          rawBody: Buffer.from('Invalid JSON'),
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

  describe('delete', () => {
    it('should use the user defined timeout if provided', async () => {
      const usedDefinedTimeout = 60000;
      const customHttpAdapter = new GotHttpAdapter({
        timeout: usedDefinedTimeout,
      });

      await customHttpAdapter.delete('http://example.com');

      expect(mockGot.delete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: usedDefinedTimeout,
      }));
    });

    it('should use the default timeout if not provided explicitly', async () => {
      const customHttpAdapter = new GotHttpAdapter();
      await customHttpAdapter.delete('http://example.com');

      expect(mockGot.delete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
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
      await httpAdapter.delete(url, searchParams, {}, { arrayFormat });
      expect(mockGot.delete).toHaveBeenCalledWith(url + '?' + expectedQuery, expect.anything());
    });

    it('should correctly handle urls with provided query params', async () => {
      const urlWithQuery = 'http://example.com?bar=foo';
      await httpAdapter.delete(urlWithQuery, {
        foo: 'bar',
      });

      expect(mockGot.delete).toHaveBeenCalledWith(urlWithQuery + '&foo=bar', expect.anything());
    });

    it('should call the got.delete method with correct args', async () => {
      const url = 'http://example.com';
      const headers = {
        'My-Header': 'value',
      };

      await httpAdapter.delete(url, undefined, headers);

      expect(mockGot.delete).toHaveBeenCalledWith(url, expect.objectContaining({
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
      await httpAdapter.delete('http://example.com', {}, undefined, {
        parseJSON,
      });

      expect(mockGot.delete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        responseType: expectedResponseType,
      }));
    });

    it('should return the body from the response', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.delete.mockResolvedValueOnce(response);

      const result = await httpAdapter.delete('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.delete.mockResolvedValueOnce(response);

      const result = await httpAdapter.delete('http://example.com', undefined, undefined, { resolveFullResponse: true });
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
      mockGot.delete.mockRejectedValueOnce(httpError);

      let caughtErr;
      try {
        await httpAdapter.delete('http://example.com');
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
      mockGot.delete.mockRejectedValueOnce(requestError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.delete(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpRequestError);
      expect(caughtErr.request).toEqual({
        url,
        method: 'DELETE',
        headers: {},
      });
    });

    it('should throw HttpGenericError when got throws subclass of RequestError', async () => {
      const timeoutError = produceFoolInstance(RequestError);
      timeoutError.message = 'Connection has timed out';
      timeoutError.name = 'TimeoutError';
      mockGot.delete.mockRejectedValueOnce(timeoutError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.delete(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpGenericError);
      expect(caughtErr.originalError).toEqual(timeoutError);
    });

    it('should throw ParseError when got throws ParseError', async () => {
      const parseError = produceFoolInstance(GotParseError, {
        message: 'Unexpected token < at position 10 in "http://example.com"',
        name: 'ParseError',
        response: {
          rawBody: Buffer.from('Invalid JSON'),
        },
      });

      mockGot.delete.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.delete('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(ParseError);
      expect(caughtErr.message).toEqual('Unexpected token < at position 10');
    });
  });

  describe('patch', () => {
    it('should use the user defined timeout if provided', async () => {
      const usedDefinedTimeout = 60000;
      const customHttpAdapter = new GotHttpAdapter({
        timeout: usedDefinedTimeout,
      });

      await customHttpAdapter.patch('http://example.com');

      expect(mockGot.patch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: usedDefinedTimeout,
      }));
    });

    it('should use the default timeout if not provided explicitly', async () => {
      const customHttpAdapter = new GotHttpAdapter();

      await customHttpAdapter.patch('http://example.com');

      expect(mockGot.patch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: 5000,
      }));
    });

    it('should call the got.patch method with correct args', async () => {
      const url = 'http://example.com';
      const headers = {
        'My-Header': 'again-my-value',
      };
      const body = {};
      await httpAdapter.patch(url, body, headers);

      expect(mockGot.patch).toHaveBeenCalledWith(url, expect.objectContaining({
        headers,
        resolveBodyOnly: false,
        retry: 0,
      }));
    });

    it.each([
      [undefined, 'json'],
      [true, 'json'],
      [false, 'text'],
    ])('should call the got.patch with correct responseType when passing parseJSON = %s', async (parseJSON: boolean | undefined, expectedResponseType: string) => {
      await httpAdapter.patch('http://example.com', {}, undefined, {
        parseJSON,
      });

      expect(mockGot.patch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        responseType: expectedResponseType,
      }));
    });

    it.each([
      [undefined, 'json'],
      [ContentTypes.Form, 'form'],
      [ContentTypes.JSON, 'json'],
    ])('should call the got.patch with correct key (form or json) when passing contentType = %s', async (contentType: ContentTypes | undefined, expectedKey: string) => {
      const body = {
        bar: 'foo',
      };
      await httpAdapter.patch('http://example.com', body, undefined, {
        contentType,
      });

      expect(mockGot.patch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        [expectedKey]: body,
      }));
    });

    it('should return the body from the response', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.patch.mockResolvedValueOnce(response);

      const result = await httpAdapter.patch('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.patch.mockResolvedValueOnce(response);

      const result = await httpAdapter.patch('http://example.com', {}, {}, { resolveFullResponse: true });
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
      mockGot.patch.mockRejectedValueOnce(httpError);

      let caughtErr;
      try {
        await httpAdapter.patch('http://example.com');
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
      mockGot.patch.mockRejectedValueOnce(requestError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.patch(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpRequestError);
      expect(caughtErr.request).toEqual({
        url,
        method: 'PATCH',
        headers: {},
        body: {},
      });
    });

    it('should throw HttpTimeoutError when got throws TimeoutError', async () => {
      const timeoutError = produceFoolInstance(TimeoutError, {
        message: 'Timeout Error',
        name: 'TimeoutError',
      });
      mockGot.patch.mockRejectedValueOnce(timeoutError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.patch(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpTimeoutError);
    });

    it('should throw HttpGenericError when got throws subclass of RequestError', async () => {
      const unexpectedCloseError = produceFoolInstance(RequestError, {
        message: 'Connection has been closed unexpectedly',
        name: 'UnexpectedCloseError',
      });
      mockGot.patch.mockRejectedValueOnce(unexpectedCloseError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.patch(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpGenericError);
      expect(caughtErr.originalError).toEqual(unexpectedCloseError);
    });

    it('should throw ParseError when got throws ParseError', async () => {
      const parseError = produceFoolInstance(GotParseError, {
        message: 'Unexpected token < at position 10 in "http://example.com"',
        name: 'ParseError',
        response: {
          rawBody: Buffer.from('Invalid JSON'),
        },
      });

      mockGot.patch.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.patch('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(ParseError);
      expect(caughtErr.message).toEqual('Unexpected token < at position 10');
    });
  });

  describe('put', () => {
    it('should use the user defined timeout if provided', async () => {
      const usedDefinedTimeout = 60000;
      const customHttpAdapter = new GotHttpAdapter({
        timeout: usedDefinedTimeout,
      });

      await customHttpAdapter.put('http://example.com');

      expect(mockGot.put).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: usedDefinedTimeout,
      }));
    });

    it('should use the default timeout if not provided explicitly', async () => {
      const customHttpAdapter = new GotHttpAdapter();

      await customHttpAdapter.put('http://example.com');

      expect(mockGot.put).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        timeout: 5000,
      }));
    });

    it('should call the got.put method with correct args', async () => {
      const url = 'http://example.com';
      const headers = {
        'My-Header': 'again-my-value',
      };
      const body = {};
      await httpAdapter.put(url, body, headers);

      expect(mockGot.put).toHaveBeenCalledWith(url, expect.objectContaining({
        headers,
        resolveBodyOnly: false,
        retry: 0,
      }));
    });

    it.each([
      [undefined, 'json'],
      [true, 'json'],
      [false, 'text'],
    ])('should call the got.put with correct responseType when passing parseJSON = %s', async (parseJSON: boolean | undefined, expectedResponseType: string) => {
      await httpAdapter.put('http://example.com', {}, undefined, {
        parseJSON,
      });

      expect(mockGot.put).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        responseType: expectedResponseType,
      }));
    });

    it.each([
      [undefined, 'json'],
      [ContentTypes.Form, 'form'],
      [ContentTypes.JSON, 'json'],
    ])('should call the got.put with correct key (form or json) when passing contentType = %s', async (contentType: ContentTypes | undefined, expectedKey: string) => {
      const body = {
        bar: 'foo',
      };
      await httpAdapter.put('http://example.com', body, undefined, {
        contentType,
      });

      expect(mockGot.put).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        [expectedKey]: body,
      }));
    });

    it('should return the body from the response', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.put.mockResolvedValueOnce(response);

      const result = await httpAdapter.put('http://example.com');
      expect(result).toEqual(response.body);
    });

    it('should return the full response when this is requested', async () => {
      const response = {
        body: {},
        headers: {},
      };
      mockGot.put.mockResolvedValueOnce(response);

      const result = await httpAdapter.put('http://example.com', {}, {}, { resolveFullResponse: true });
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
      mockGot.put.mockRejectedValueOnce(httpError);

      let caughtErr;
      try {
        await httpAdapter.put('http://example.com');
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
      mockGot.put.mockRejectedValueOnce(requestError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.put(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpRequestError);
      expect(caughtErr.request).toEqual({
        url,
        method: 'PUT',
        headers: {},
        body: {},
      });
    });

    it('should throw HttpTimeoutError when got throws TimeoutError', async () => {
      const timeoutError = produceFoolInstance(TimeoutError, {
        message: 'Timeout Error',
        name: 'TimeoutError',
      });
      mockGot.put.mockRejectedValueOnce(timeoutError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.put(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpTimeoutError);
    });

    it('should throw HttpGenericError when got throws subclass of RequestError', async () => {
      const unexpectedCloseError = produceFoolInstance(RequestError, {
        message: 'Connection has been closed unexpectedly',
        name: 'UnexpectedCloseError',
      });
      mockGot.put.mockRejectedValueOnce(unexpectedCloseError);

      let caughtErr;
      const url = 'http://example.com';
      try {
        await httpAdapter.put(url);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(HttpGenericError);
      expect(caughtErr.originalError).toEqual(unexpectedCloseError);
    });

    it('should throw ParseError when got throws ParseError', async () => {
      const parseError = produceFoolInstance(GotParseError, {
        message: 'Unexpected token < at position 10 in "http://example.com"',
        name: 'ParseError',
        response: {
          rawBody: Buffer.from('Invalid JSON'),
        },
      });

      mockGot.put.mockRejectedValueOnce(parseError);

      let caughtErr;

      try {
        await httpAdapter.put('http://example.com');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeInstanceOf(ParseError);
      expect(caughtErr.message).toEqual('Unexpected token < at position 10');
    });
  });
});

