import { Headers } from '../HttpAdapter';

type Request = {
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers: Headers,
}

type ConstructorParams = {
  message: string,
  request: Request,
}

class HttpRequestError extends Error {
  public readonly request: Request;

  constructor(params: ConstructorParams) {
    super(params.message);

    this.name = 'HttpRequestError';
    this.request = params.request;
  }
}

export default HttpRequestError;
export { Request };
