import * as fs from 'fs';
import * as core from '@actions/core';
import * as dockleHelper from './dockleHelper';
import * as gitHubHelper from './gitHubHelper';
import * as inputHelper from './inputHelper';
import * as trivyHelper from './trivyHelper';
import * as fileHelper from './fileHelper';
import { GitHubClient } from './githubClient';
import { StatusCodes } from "./httpClient";

const APP_NAME = 'Scanitizer';
const APP_LINK = 'https://github.com/apps/scanitizer';

export async function createScanResult(trivyStatus: number, dockleStatus: number): Promise<void> {
  const gitHubClient = new GitHubClient(process.env.GITHUB_REPOSITORY, inputHelper.githubToken);
  const scanResultPayload = getScanResultPayload(trivyStatus, dockleStatus);
  const response = await gitHubClient.createScanResult(scanResultPayload);

  if (response.statusCode == StatusCodes.UNPROCESSABLE_ENTITY
    && response.body
    && response.body.message
    && response.body.message.error_code === 'APP_NOT_INSTALLED') {
    // If the app is not installed, try to create the check run using GitHub actions token.
    console.log('Looks like the scanitizer app is not installed on the repo. Falling back to check run creation through GitHub actions app...');
    console.log(`For a better experience with managing allowedlist, install ${APP_NAME} app from ${APP_LINK}.`);

    const checkRunPayload = getCheckRunPayload(trivyStatus, dockleStatus);
    await gitHubClient.createCheckRun(checkRunPayload);
  }
  else if (response.statusCode != StatusCodes.OK) {
    throw Error(`An error occurred while creating scan result. Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, head_sha: ${scanResultPayload['head_sha']}`);
  }
  else {
    core.setOutput('check-run-url', response.body['check_run']['html_url']);
    console.log(`Created scan result. Url: ${response.body['check_run']['html_url']}`);
  }
}

export function getScanReport(trivyResult: trivyHelper.TrivyResult, dockleStatus: number): string {
  const trivyStatus = trivyResult.status;
  const scanReportPath = `${fileHelper.getContainerScanDirectory()}/scanreport.json`;
  let trivyOutput = [];
  if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE)
    trivyOutput = trivyHelper.getFilteredOutput();
  let dockleOutput = [];
  if (inputHelper.isRunQualityChecksEnabled() && dockleStatus === dockleHelper.DOCKLE_EXIT_CODE)
    dockleOutput = dockleHelper.getFilteredOutput();
  const scanReportObject = {
    "imageName": inputHelper.imageName,
    "vulnerabilities": trivyOutput,
    "bestPracticeViolations": dockleOutput,
    "vulnerabilityScanTimestamp": trivyResult.timestamp
  };
  fs.writeFileSync(scanReportPath, JSON.stringify(scanReportObject, null, 2));
  return scanReportPath;
}

export function getConfigForTable(widths: number[]): any {
  var columns = {};
  let index = 0;
  widths.forEach(width => {
    columns[index.toString()] = {
      width: width,
      wrapWord: true
    };
    index = index + 1;
  });
  let config = {
    columns: columns
  };

  return config;
}

export function extractErrorsFromLogs(outputPath: string, toolName?: string): any {
  const out = fs.readFileSync(outputPath, 'utf8');
  const lines = out.split('\n');
  let errors = [];
  lines.forEach((line) => {
    const errIndex = line.indexOf("FATAL");
    if (errIndex >= 0) {
      const err = line.substring(errIndex);
      errors.push(err);
    }
  });
  return errors;
}

export function addLogsToDebug(outputPath: string) {
  const out = fs.readFileSync(outputPath, 'utf8');
  core.debug(out);
}

function getCheckRunPayload(trivyStatus: number, dockleStatus: number): any {
  const headSha = gitHubHelper.getHeadSha();
  const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
  let checkSummary = getCheckSummary(trivyStatus, dockleStatus);

  let appHyperlink = `<a href=${APP_LINK}>${APP_NAME}</a>`;
  checkSummary = `${checkSummary}\n\nFor a better experience with managing allowedlist, install ${appHyperlink} app.`

  const checkText = getCheckText(trivyStatus, dockleStatus);

  const payload = {
    head_sha: headSha,
    name: `[container-scan] ${inputHelper.imageName}`,
    status: "completed",
    conclusion: checkConclusion,
    output: {
      title: "Container scan result",
      summary: checkSummary,
      text: checkText
    }
  }

  return payload;
}

function getScanResultPayload(trivyStatus: number, dockleStatus: number): any {
  const headSha = gitHubHelper.getHeadSha();
  const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
  const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
  const checkText = getCheckText(trivyStatus, dockleStatus);

  const payload = {
    action_name: process.env['GITHUB_ACTION'],
    action_sha: process.env['GITHUB_ACTION'],
    additional_properties: {
      conclusion: checkConclusion,
      is_pull_request: gitHubHelper.isPullRequestTrigger()
    },
    description: checkText,
    head_sha: headSha,
    image_name: inputHelper.imageName,
    status: "completed",
    summary: checkSummary
  }

  return payload;
}

function getCheckConclusion(trivyStatus: number, dockleStatus: number): string {
  const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
  return checkConclusion;
}

function getCheckSummary(trivyStatus: number, dockleStatus: number): string {
  const header: string = `Scanned image \`${inputHelper.imageName}\`.\nSummary:`;
  const trivySummary = trivyHelper.getSummary(trivyStatus);
  let summary = `${header}\n\n${trivySummary}`;

  if (inputHelper.isRunQualityChecksEnabled()) {
    const dockleSummary = dockleHelper.getSummary(dockleStatus);
    summary = `${summary}\n\n${dockleSummary}`;
  }

  return summary;
}

function getCheckText(trivyStatus: number, dockleStatus: number): string {
  const separator = '___';
  const trivyText = trivyHelper.getText(trivyStatus);
  let text = trivyText;

  if (inputHelper.isRunQualityChecksEnabled()) {
    const dockleText = dockleHelper.getText(dockleStatus);
    text = `${text}\n${separator}\n${dockleText}`;
  }

  return text;
}