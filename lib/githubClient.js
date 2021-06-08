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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const util = __importStar(require("util"));
const httpClient_1 = require("./httpClient");
class GitHubClient {
    constructor(repository, token) {
        this._repository = repository;
        this._token = token;
    }
    createScanResult(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const checkRunUrl = `https://api.github.com/repos/${this._repository}/container-scanning/check-run`;
            const webRequest = new httpClient_1.WebRequest();
            webRequest.method = "POST";
            webRequest.uri = checkRunUrl;
            webRequest.body = JSON.stringify(payload);
            webRequest.headers = {
                Authorization: `Bearer ${this._token}`
            };
            console.log(`Creating scan result. image_name: ${payload['image_name']}, head_sha: ${payload['head_sha']}`);
            const response = yield httpClient_1.sendRequest(webRequest);
            core.debug(util.format('Response from scanitizer app:\n', response.body));
            return Promise.resolve(response);
        });
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
            core.setOutput('check-run-url', response.body['html_url']);
            console.log(`Created check run. Url: ${response.body['html_url']}`);
        });
    }
}
exports.GitHubClient = GitHubClient;
