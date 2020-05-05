import { WebRequest, WebResponse, sendRequest, StatusCodes } from "./httpClient";

export class GitHubClient {
    constructor(repository: string, token: string) {
        this._repository = repository;
        this._token = token;
    }

    public async createCheckRun(payload: any): Promise<void> {
        const checkRunUrl = `https://api.github.com/repos/${this._repository}/check-runs`;
        const webRequest = new WebRequest();
        webRequest.method = "POST";
        webRequest.uri = checkRunUrl;
        webRequest.body = JSON.stringify(payload);
        webRequest.headers = {
            Authorization: `Bearer ${this._token}`,
            Accept: 'application/vnd.github.antiope-preview+json'
        };

        console.log(`Creating check run. Name: ${payload['name']}, head_sha: ${payload['head_sha']}`);
        const response: WebResponse = await sendRequest(webRequest);
        if (response.statusCode != StatusCodes.CREATED) {
            throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, Url: ${checkRunUrl}, head_sha: ${payload['head_sha']}`);
        }

        console.log(`Created check run. Url: ${response.body['html_url']}`);
    }

    public async createCheckRunThroughApp(payload: any): Promise<void> {
        const checkRunUrl = `https://api.github.com/repos/${this._repository}/container-scanning/check-run`;
        const webRequest = new WebRequest();
        webRequest.method = "POST";
        webRequest.uri = checkRunUrl;
        webRequest.body = JSON.stringify(payload);
        webRequest.headers = {
            Authorization: `Bearer ${this._token}`
        };

        console.log(`Creating check run. image_name: ${payload['image_name']}, head_sha: ${payload['head_sha']}`);
        const response: WebResponse = await sendRequest(webRequest);
        if (response.statusCode != StatusCodes.OK) {
            throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, head_sha: ${payload['head_sha']}`);
        }

        console.log(`Created check run through app. Url: ${response.body['check_run']['html_url']}`);
    }

    private _repository: string;
    private _token: string;
}