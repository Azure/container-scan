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
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const dockleHelper = __importStar(require("./dockleHelper"));
const gitHubHelper = __importStar(require("./gitHubHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const trivyHelper = __importStar(require("./trivyHelper"));
const fileHelper = __importStar(require("./fileHelper"));
const githubClient_1 = require("./githubClient");
const httpClient_1 = require("./httpClient");
const APP_NAME = 'Scanitizer';
const APP_LINK = 'https://github.com/apps/scanitizer';
function createScanResult(trivyStatus, dockleStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        const gitHubClient = new githubClient_1.GitHubClient(process.env.GITHUB_REPOSITORY, inputHelper.githubToken);
        const scanResultPayload = getScanResultPayload(trivyStatus, dockleStatus);
        const response = yield gitHubClient.createScanResult(scanResultPayload);
        if (response.statusCode == httpClient_1.StatusCodes.UNPROCESSABLE_ENTITY
            && response.body
            && response.body.message
            && response.body.message.error_code === 'APP_NOT_INSTALLED') {
            // If the app is not installed, try to create the check run using GitHub actions token.
            console.log('Looks like the scanitizer app is not installed on the repo. Falling back to check run creation through GitHub actions app...');
            console.log(`For a better experience with managing allowedlist, install ${APP_NAME} app from ${APP_LINK}.`);
            const checkRunPayload = getCheckRunPayload(trivyStatus, dockleStatus);
            yield gitHubClient.createCheckRun(checkRunPayload);
        }
        else if (response.statusCode != httpClient_1.StatusCodes.OK) {
            throw Error(`An error occurred while creating scan result. Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, head_sha: ${scanResultPayload['head_sha']}`);
        }
        else {
            core.setOutput('check-run-url', response.body['check_run']['html_url']);
            console.log(`Created scan result. Url: ${response.body['check_run']['html_url']}`);
        }
    });
}
exports.createScanResult = createScanResult;
function getScanReport(trivyResult, dockleStatus) {
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
exports.getScanReport = getScanReport;
function getConfigForTable(widths) {
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
exports.getConfigForTable = getConfigForTable;
function extractErrorsFromLogs(outputPath, toolName) {
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
exports.extractErrorsFromLogs = extractErrorsFromLogs;
function addLogsToDebug(outputPath) {
    const out = fs.readFileSync(outputPath, 'utf8');
    core.debug(out);
}
exports.addLogsToDebug = addLogsToDebug;
function getCheckRunPayload(trivyStatus, dockleStatus) {
    const headSha = gitHubHelper.getHeadSha();
    const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
    let checkSummary = getCheckSummary(trivyStatus, dockleStatus);
    let appHyperlink = `<a href=${APP_LINK}>${APP_NAME}</a>`;
    checkSummary = `${checkSummary}\n\nFor a better experience with managing allowedlist, install ${appHyperlink} app.`;
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
    };
    return payload;
}
function getScanResultPayload(trivyStatus, dockleStatus) {
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
    };
    return payload;
}
function getCheckConclusion(trivyStatus, dockleStatus) {
    const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
    return checkConclusion;
}
function getCheckSummary(trivyStatus, dockleStatus) {
    const header = `Scanned image \`${inputHelper.imageName}\`.\nSummary:`;
    const trivySummary = trivyHelper.getSummary(trivyStatus);
    let summary = `${header}\n\n${trivySummary}`;
    if (inputHelper.isRunQualityChecksEnabled()) {
        const dockleSummary = dockleHelper.getSummary(dockleStatus);
        summary = `${summary}\n\n${dockleSummary}`;
    }
    return summary;
}
function getCheckText(trivyStatus, dockleStatus) {
    const separator = '___';
    const trivyText = trivyHelper.getText(trivyStatus);
    let text = trivyText;
    if (inputHelper.isRunQualityChecksEnabled()) {
        const dockleText = dockleHelper.getText(dockleStatus);
        text = `${text}\n${separator}\n${dockleText}`;
    }
    return text;
}
