type ConstructorParams<ResponseBodyType = unknown> = {
  message: string;
  responseBody: ResponseBodyType;
}

class ParseError<ResponseBodyType = unknown> extends Error {
  public readonly responseBody: ResponseBodyType;

  constructor(params: ConstructorParams<ResponseBodyType>) {
    super(params.message);

    this.name = 'ParseError';
    this.responseBody = params.responseBody;
  }
}

export default ParseError;
