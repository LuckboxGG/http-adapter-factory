type ConstructorParams = {
  message: string,
  originalError: Error,
}

class HttpGenericError extends Error {
  public readonly originalError: Error;

  constructor(params: ConstructorParams) {
    super(params.message);

    this.name = 'HttpGenericError';
    this.originalError = params.originalError;
  }
}

export default HttpGenericError;
