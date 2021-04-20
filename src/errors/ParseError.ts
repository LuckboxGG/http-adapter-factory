type ConstructorParams = {
  message: string;
  responseBody: string;
}

class ParseError extends Error {
  public readonly responseBody: string;

  constructor(params: ConstructorParams) {
    super(params.message);

    this.name = 'ParseError';
    this.responseBody = params.responseBody;
  }
}

export default ParseError;
