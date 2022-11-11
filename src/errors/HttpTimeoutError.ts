class HttpTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Timeout of ${timeout} exceeded`);
  }
}

export default HttpTimeoutError;
