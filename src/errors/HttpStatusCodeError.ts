import HttpStatusCodes from 'http-status-codes';

type ConstructorParams = {
  statusCode: number,
  message: string,
}

class HttpStatusCodeError extends Error {
  public readonly statusCode: number;
  public readonly message: string;

  constructor(params: ConstructorParams) {
    super(params.message);

    this.name = 'HttpStatusCodeError';
    this.statusCode = params.statusCode;
  }

  isTooManyRequests(): boolean {
    return this.statusCode === HttpStatusCodes.TOO_MANY_REQUESTS;
  }

  isUnauthorized(): boolean {
    return this.statusCode === HttpStatusCodes.UNAUTHORIZED;
  }

  isForbidden(): boolean {
    return this.statusCode === HttpStatusCodes.FORBIDDEN;
  }

  isServerError(): boolean {
    return this.statusCode === HttpStatusCodes.INTERNAL_SERVER_ERROR;
  }

  isNotFound(): boolean {
    return this.statusCode === HttpStatusCodes.NOT_FOUND;
  }

  isBadRequest(): boolean {
    return this.statusCode === HttpStatusCodes.BAD_REQUEST;
  }

  isBadGateway(): boolean {
    return this.statusCode === HttpStatusCodes.BAD_GATEWAY;
  }

  isServiceUnavailable(): boolean {
    return this.statusCode === HttpStatusCodes.SERVICE_UNAVAILABLE;
  }

  isGatewayTimeout(): boolean {
    return this.statusCode === HttpStatusCodes.GATEWAY_TIMEOUT;
  }

  getStatusCode(): number {
    return this.statusCode;
  }
}

export default HttpStatusCodeError;
