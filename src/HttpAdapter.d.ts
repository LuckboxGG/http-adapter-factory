declare type SearchParams = Record<string, any>;
declare type Headers = Record<string, any>;
declare type Body = Record<string, any>;
declare type ConstructorParams = {
    timeout?: number;
};
declare enum ArrayFormats {
    Brackets = 'brackets',
    Indices = 'indices',
    Repeat = 'repeat',
    Comma = 'comma'
}
declare enum ContentTypes {
    JSON = 'json',
    Form = 'form'
}
declare type CustomGetOptions = {
    arrayFormat?: ArrayFormats;
    parseJSON?: boolean;
    resolveFullResponse?: boolean;
};
declare type CustomPostOptions = Omit<CustomGetOptions, 'arrayFormat'> & {
    contentType?: ContentTypes;
};
declare type AnyRequestOptions = CustomGetOptions | CustomPostOptions;
declare type FullResponse<T> = {
    body: T;
    headers: Headers;
};
interface HttpAdapter {
    get<Response>(url: string, params?: SearchParams, headers?: Headers, opts?: CustomGetOptions): Promise<Response | FullResponse<Response>>;
    post<Response>(url: string, body?: Body, headers?: Headers, opts?: CustomPostOptions): Promise<Response | FullResponse<Response>>;
}
declare const DEFAULTS: {
    TIMEOUT: number;
    PARSE_JSON: boolean;
    RESOLVE_FULL_RESPONSE: boolean;
    CONTENT_TYPE: ContentTypes;
    ARRAY_FORMAT: ArrayFormats;
};
export default HttpAdapter;
export { ArrayFormats, ContentTypes, CustomGetOptions, CustomPostOptions, AnyRequestOptions, FullResponse, ConstructorParams, SearchParams, Headers, Body, DEFAULTS };
