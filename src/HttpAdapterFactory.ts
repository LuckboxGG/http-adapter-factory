import HttpAdapter, { ConstructorParams } from './HttpAdapter';
import GotHttpAdapter from './GotHttpAdapter';

class HttpAdapterFactory {
  create(params: ConstructorParams): HttpAdapter {
    return new GotHttpAdapter(params);
  }
}

export default HttpAdapterFactory;
