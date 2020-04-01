"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const httpClient_1 = require("./httpClient");
class GitHubClient {
    constructor(repository, token) {
        this._repository = repository;
        this._token = token;
    }
    createCheckRun(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const checkRunUrl = `https://api.github.com/repos/${this._repository}/check-runs`;
            const webRequest = new httpClient_1.WebRequest();
            webRequest.method = "POST";
            webRequest.uri = checkRunUrl;
            webRequest.body = JSON.stringify(payload);
            webRequest.headers = {
                Authorization: `Bearer ${this._token}`,
                Accept: 'application/vnd.github.antiope-preview+json'
            };
            console.log(`Creating check run. Name: ${payload['name']}, head_sha: ${payload['head_sha']}`);
            const response = yield httpClient_1.sendRequest(webRequest);
            if (response.statusCode != httpClient_1.StatusCodes.CREATED) {
                throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, Url: ${checkRunUrl}, head_sha: ${payload['head_sha']}`);
            }
            console.log(`Created check run. Url: ${response.body['html_url']}`);
        });
    }
}
exports.GitHubClient = GitHubClient;
