type ConstructorParams = {
  statusCode: number,
  message: string,
  body: unknown,
}

class HttpStatusCodeError extends Error {
  public readonly statusCode: number;
  public readonly message: string;
  public readonly body: unknown;

  constructor(params: ConstructorParams) {
    super(params.message);

    this.name = 'HttpStatusCodeError';
    this.statusCode = params.statusCode;
    this.body = params.body;
  }

  isTooManyRequests(): boolean {
    return this.statusCode === 429;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isServerError(): boolean {
    return this.statusCode === 500;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isBadRequest(): boolean {
    return this.statusCode === 400;
  }

  isBadGateway(): boolean {
    return this.statusCode === 502;
  }

  isServiceUnavailable(): boolean {
    return this.statusCode === 503;
  }

  isGatewayTimeout(): boolean {
    return this.statusCode === 504;
  }

  getStatusCode(): number {
    return this.statusCode;
  }
}

export default HttpStatusCodeError;
