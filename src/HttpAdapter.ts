type SearchParams = Record<string, unknown>;
type Headers = Record<string, string | Array<string>>;
type Body = Record<string, unknown>;

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

type CommonRequestOptions = {
  parseJSON?: boolean,
  resolveFullResponse?: boolean,
}

type RequestWithBodyOptions = CommonRequestOptions & {
  contentType?: ContentTypes,
}

type RequestWithoutBodyOptions = CommonRequestOptions & {
  arrayFormat?: ArrayFormats,
}

type CustomGetOptions = RequestWithoutBodyOptions;
type CustomDeleteOptions = RequestWithoutBodyOptions;
type CustomPostOptions = RequestWithBodyOptions;
type CustomPatchOptions = RequestWithBodyOptions;
type CustomPutOptions = RequestWithBodyOptions;

type AnyRequestOptions = CustomGetOptions | CustomDeleteOptions | CustomPostOptions | CustomPatchOptions | CustomPutOptions;

type FullResponse<T> = {
  body: T,
  headers: Headers,
}

interface HttpAdapter {
  get<Response>(url: string, params?: SearchParams, headers?: Headers, opts?: CustomGetOptions): Promise<Response | FullResponse<Response>>;
  post<Response>(url: string, body?: Body, headers?: Headers, opts?: CustomPostOptions): Promise<Response | FullResponse<Response>>;
  delete<Response>(url: string, params?: SearchParams, headers?: Headers, opts?: CustomDeleteOptions): Promise<Response | FullResponse<Response>>;
  patch<Response>(url: string, body?: Body, headers?: Headers, opts?: CustomPatchOptions): Promise<Response | FullResponse<Response>>;
  put<Response>(url: string, body?: Body, headers?: Headers, opts?: CustomPutOptions): Promise<Response | FullResponse<Response>>;
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
  CustomDeleteOptions,
  CustomPatchOptions,
  CustomPutOptions,
  FullResponse,
  ConstructorParams,
  SearchParams,
  Headers,
  Body,
  DEFAULTS,
  AnyRequestOptions,
};
