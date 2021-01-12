import { Headers } from '../HttpAdapter';

type ObjectLike = Record<string, any>;

type Request = {
  method: string,
  url: string,
  body?: ObjectLike,
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
