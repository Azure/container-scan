class HttpClient {
    constructor(userAgent, handlers?, requestOptions?) {
        console.log('HttpClient constructor called');
    }

    async request(verb, requestUrl, data, headers) {
        return new HttpClientResponse();
    }
}

class HttpClientResponse {
    message = {
        statusCode: 200,
        statusMessage: 'some_message',
        headers: 'some_header'
    };
    body = {
        'html_url': 'https://some.url',
        'check_run': {
            'some_key': 'some_value',
            'html_url': 'https://some.url'
        }
    };
    constructor() {
        console.log('HttpClientResponse constructor called');
    }

    async readBody() {
        return JSON.stringify(this.body);
    }
}

var httpClient = {
    HttpClient: HttpClient,
    HttpClientResponse: HttpClientResponse
}

module.exports = httpClient;