"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fileHelper = __importStar(require("./fileHelper"));
function getHeadSha() {
    return isPullRequestTrigger() ? getPullRequestHeadSha() : process.env['GITHUB_SHA'];
}
exports.getHeadSha = getHeadSha;
function isPullRequestTrigger() {
    return process.env['GITHUB_EVENT_NAME'] === 'pull_request';
}
exports.isPullRequestTrigger = isPullRequestTrigger;
function getPullRequestHeadSha() {
    const eventJson = getEventJson();
    return eventJson["pull_request"]["head"]["sha"];
}
function getEventJson() {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    let eventJson;
    if (eventPath) {
        eventJson = fileHelper.getFileJson(eventPath);
        core.debug(`Event json: ${eventJson}`);
    }
    return eventJson;
}
