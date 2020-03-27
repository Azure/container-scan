import * as core from '@actions/core';

export const imageName = core.getInput("image-name");
export const githubToken = core.getInput("github-token");
export const username = core.getInput("username");
export const password = core.getInput("password");
export const severityThreshold = core.getInput("severity-threshold");
export const addCISChecks = core.getInput("add-CIS-checks");

export function isCisChecksEnabled(): boolean {
    return addCISChecks.toLowerCase() === "true";
}