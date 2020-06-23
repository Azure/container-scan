class HttpClient {
    constructor(userAgent, handlers?, requestOptions?) {
        console.log('HttpClient constructor called');
    }

    async request(verb, requestUrl, data, headers) {
        return new HttpClientResponse();
    }
}

let mockedMessage = {
    statusCode: 200,
    statusMessage: 'some_message',
    headers: 'some_header'
};

function __setMockedMessage(message) {
    mockedMessage = message;
}

class HttpClientResponse {
    message = mockedMessage;
    body = {
        'html_url': 'https://some.url',
        'check_run': {
            'some_key': 'some_value',
            'html_url': 'https://some.url'
        },
        'message': this.message
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
    HttpClientResponse: HttpClientResponse,
    __setMockedMessage: __setMockedMessage
}

module.exports = httpClient;