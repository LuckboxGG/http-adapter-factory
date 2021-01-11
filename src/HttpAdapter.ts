type ObjectLike = Record<string, any>

type SearchParams = ObjectLike;
type Headers = ObjectLike;
type Body = ObjectLike;

type ConstructorParams = {
  timeout?: number,
}

enum ArrayFormats {
  Brackets = 'brackets',
  Indices = 'indices',
  Repeat = 'repeat',
  Comma = 'comma',
}

enum ContentTypes {
  JSON = 'json',
  Form = 'form',
}

type CustomGetOptions = {
  arrayFormat?: ArrayFormats,
  parseJSON?: boolean,
  resolveFullResponse?: boolean,
}

type CustomPostOptions = Omit<CustomGetOptions, 'arrayFormat'> & {
  contentType?: ContentTypes,
}

type AnyRequestOptions = CustomGetOptions | CustomPostOptions;

type FullResponse<T> = {
  body: T,
  headers: Headers,
}

interface HttpAdapter {
  get<Response>(url: string, params?: SearchParams, headers?: Headers, opts?: CustomGetOptions): Promise<Response | FullResponse<Response>>;
  post<Response>(url: string, body?: Body, headers?: Headers, opts?: CustomPostOptions): Promise<Response | FullResponse<Response>>;
}

const DEFAULTS = {
  TIMEOUT: 5000,
  PARSE_JSON: true,
  RESOLVE_FULL_RESPONSE: false,
  CONTENT_TYPE: ContentTypes.JSON,
  ARRAY_FORMAT: ArrayFormats.Brackets,
};

export default HttpAdapter;
export {
  ArrayFormats,
  ContentTypes,
  CustomGetOptions,
  CustomPostOptions,
  AnyRequestOptions,
  FullResponse,
  ConstructorParams,
  SearchParams,
  Headers,
  Body,
  DEFAULTS,
};
