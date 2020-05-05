import * as fs from 'fs';
import * as core from '@actions/core';
import * as dockleHelper from './dockleHelper';
import * as gitHubHelper from './gitHubHelper';
import * as inputHelper from './inputHelper';
import * as trivyHelper from './trivyHelper';
import * as fileHelper from './fileHelper';

export function getCheckRunPayload(trivyStatus: number, dockleStatus: number): any {
  const headSha = gitHubHelper.getHeadSha();
  const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
  const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
  const checkText = getCheckText(trivyStatus, dockleStatus);

  const checkRunPayload = {
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

  return checkRunPayload;
}

export function getCheckRunThroughAppPayload(trivyStatus: number, dockleStatus: number): any {
  const headSha = gitHubHelper.getHeadSha();
  const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
  const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
  const checkText = getCheckText(trivyStatus, dockleStatus);

  const checkRunThroughAppPayload = {
    action_name: process.env['GITHUB_ACTION'],
    action_sha: process.env['GITHUB_ACTION'],
    additional_properties: {
      is_pull_request: gitHubHelper.isPullRequestTrigger()
    },
    description: checkText,
    head_sha: headSha,
    image_name: inputHelper.imageName,
    status: checkConclusion,
    summary: checkSummary
  }

  return checkRunThroughAppPayload;
}

export function getScanReport(trivyStatus: number, dockleStatus: number): string {
  const scanReportPath = `${fileHelper.getContainerScanDirectory()}/scanreport.json`;
  let trivyOutput = [];
  if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE)
    trivyOutput = trivyHelper.getFilteredOutput();
  let dockleOutput = [];
  if (inputHelper.isRunQualityChecksEnabled() && dockleStatus === dockleHelper.DOCKLE_EXIT_CODE)
    dockleOutput = dockleHelper.getFilteredOutput();
  const scanReportObject = {
    "vulnerabilities": trivyOutput,
    "bestPracticeViolations": dockleOutput
  };
  fs.writeFileSync(scanReportPath, JSON.stringify(scanReportObject, null, 2));
  return scanReportPath;
}

export function getConfigForTable(widths: number[]): any {
  let config = {
    columns: {
      0: {
        width: widths[0],
        wrapWord: true
      },
      1: {
        width: widths[1],
        wrapWord: true
      },
      2: {
        width: widths[2],
        wrapWord: true
      },
      3: {
        width: widths[3],
        wrapWord: true
      }
    }
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
