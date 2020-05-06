import * as core from '@actions/core';
import * as fileHelper from './fileHelper';

export function getHeadSha(): string {
    return isPullRequestTrigger() ? getPullRequestHeadSha() : process.env['GITHUB_SHA'];
}

export function isPullRequestTrigger(): boolean {
    return process.env['GITHUB_EVENT_NAME'] === 'pull_request';
}

function getPullRequestHeadSha(): string {
    const eventJson = getEventJson();
    return eventJson["pull_request"]["head"]["sha"];
}

function getEventJson(): any {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    let eventJson: any;
    if (eventPath) {
        eventJson = fileHelper.getFileJson(eventPath);
        core.debug(`Event json: ${eventJson}`);
    }

    return eventJson;
}