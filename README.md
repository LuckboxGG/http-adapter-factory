[![Build Status](https://travis-ci.org/LuckboxGG/http-adapter-factory.svg?branch=main)](https://travis-ci.org/LuckboxGG/http-adapter-factory)

[![Coverage Status](https://coveralls.io/repos/github/LuckboxGG/http-adapter-factory/badge.svg?branch=main)](https://coveralls.io/github/LuckboxGG/http-adapter-factory?branch=main)

# Http Adapter Factory

A factory producing http adapters with different(in the near future) underlying library implementations.

### Usage

```
import HttpAdapterFactory from './src/index';

const httpAdapterFactory = new HttpAdapterFactory();
const httpAdapter = httpAdapterFactory.create({
  timeout: 10000
});

/* ... */
await httpAdapter.get('http://example.com', { bar: 'foo '});
await httpAdapter.post('http://example.com', {
  email: 'user@exampke.com',
  password: '123456'
});
const anotherInfoLogger = infoLoggerFactory.create('Classname2');
```

## Supported implementations:

Currently, only one request library is supported - [got](https://github.com/sindresorhus/got#readme)



