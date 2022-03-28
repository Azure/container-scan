import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as table from 'table';
import * as semver from 'semver';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import * as fileHelper from './fileHelper';
import * as inputHelper from './inputHelper';
import * as utils from './utils';
import * as allowedlistHandler from './allowedlistHandler';

export const TRIVY_EXIT_CODE = 5;
export const trivyToolName = "trivy";
const stableTrivyVersion = "0.22.0";
const trivyLatestReleaseUrl = "https://api.github.com/repos/aquasecurity/trivy/releases/latest";
const KEY_TARGET = "Target";
const KEY_VULNERABILITIES = "Vulnerabilities";
const KEY_VULNERABILITY_ID = "VulnerabilityID";
const KEY_PACKAGE_NAME = "PkgName";
const KEY_SEVERITY = "Severity";
const KEY_DESCRIPTION = "Description";
const SEVERITY_CRITICAL = "CRITICAL";
const SEVERITY_HIGH = "HIGH";
const SEVERITY_MEDIUM = "MEDIUM";
const SEVERITY_LOW = "LOW";
const SEVERITY_UNKNOWN = "UNKNOWN";
const TITLE_COUNT = "COUNT";
const TITLE_VULNERABILITY_ID = "VULNERABILITY ID";
const TITLE_PACKAGE_NAME = "PACKAGE NAME";
const TITLE_SEVERITY = "SEVERITY";
const TITLE_DESCRIPTION = "DESCRIPTION";
const TITLE_TARGET = "TARGET";

export interface TrivyResult {
    status: number;
    timestamp: string;
};

export async function runTrivy(): Promise<TrivyResult> {
    const trivyPath = await getTrivy();
    const trivyCommand = "image";

    const imageName = inputHelper.imageName;

    const trivyOptions: ExecOptions = await getTrivyExecOptions();
    console.log(`Scanning for vulnerabilties in image: ${imageName}`);
    const trivyToolRunner = new ToolRunner(trivyPath, [trivyCommand, imageName], trivyOptions);
    const timestamp = new Date().toISOString();
    const trivyStatus = await trivyToolRunner.exec();
    utils.addLogsToDebug(getTrivyLogPath());
    const trivyResult: TrivyResult = {
        status: trivyStatus,
        timestamp: timestamp
    };
    return trivyResult;
}

export async function getTrivy(): Promise<string> {

    let version = inputHelper.trivyVersion;
    if(version == 'latest'){
        version = await getLatestTrivyVersion();
    }
    core.debug(util.format('Use Trivy version: %s', version));
    let cachedToolPath = toolCache.find(trivyToolName, version);
    if (!cachedToolPath) {
        let trivyDownloadPath;
        const trivyDownloadUrl = getTrivyDownloadUrl(version);
        const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/trivy`;
        core.debug(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));

        try {
            trivyDownloadPath = await toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download trivy from %s: %s", trivyDownloadUrl, error.toString()));
        }

        const untarredTrivyPath = await toolCache.extractTar(trivyDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredTrivyPath, trivyToolName, version);
    }

    const trivyToolPath = cachedToolPath + "/" + trivyToolName;
    fs.chmodSync(trivyToolPath, "777");

    core.debug(util.format("Trivy executable found at path ", trivyToolPath));
    return trivyToolPath;
}

export function getOutputPath(): string {
    const trivyOutputPath = `${fileHelper.getContainerScanDirectory()}/trivyoutput.json`;
    return trivyOutputPath;
}

export function getTrivyLogPath(): string {
    const trivyLogPath = `${fileHelper.getContainerScanDirectory()}/trivylog`;
    return trivyLogPath;
}

export function getText(trivyStatus: number): string {
    let clusteredVulnerabilities = '';
    const vulnerabilityIdsBySeverity = getVulnerabilityIdsBySeverity(trivyStatus, true);
    for (let severity in vulnerabilityIdsBySeverity) {
        if (vulnerabilityIdsBySeverity[severity].length > 0) {
            clusteredVulnerabilities = `${clusteredVulnerabilities}\n- **${severity}**:\n${vulnerabilityIdsBySeverity[severity].join('\n')}`;
        }
    }

    return `**Vulnerabilities** -${clusteredVulnerabilities ? clusteredVulnerabilities : '\nNone found.'}`;
}

export function getSummary(trivyStatus: number): string {
    let summary = '';
    switch (trivyStatus) {
        case 0:
            summary = 'No vulnerabilities were detected in the container image'
            break;
        case TRIVY_EXIT_CODE:
            let summaryDetails = '';
            let total = 0;
            const vulnerabilityIdsBySeverity = getVulnerabilityIdsBySeverity(trivyStatus, true);
            for (let severity in vulnerabilityIdsBySeverity) {
                const severityCount = vulnerabilityIdsBySeverity[severity].length;
                const isBold = severityCount > 0;
                summaryDetails = isBold
                    ? `${summaryDetails}\n**${severity}**: **${severityCount}**`
                    : summaryDetails = `${summaryDetails}\n${severity}: ${severityCount}`;

                total += severityCount;
            }

            summary = `Found ${total} vulnerabilities -${summaryDetails}`;
            break;
        default:
            summary = 'An error occurred while scanning the container image for vulnerabilities';
            break;
    }

    return `- ${summary}`;
}

export function printFormattedOutput() {
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_PACKAGE_NAME, TITLE_SEVERITY, TITLE_DESCRIPTION, TITLE_TARGET];
    rows.push(titles);

    const vulnerabilities = getVulnerabilities();
    vulnerabilities.forEach((cve: any) => {
        let row = [];
        row.push(cve[KEY_VULNERABILITY_ID]);
        row.push(cve[KEY_PACKAGE_NAME]);
        row.push(cve[KEY_SEVERITY]);
        row.push(cve[KEY_DESCRIPTION]);
        row.push(cve[KEY_TARGET]);
        rows.push(row);
    });

    let widths = [20, 15, 15, 50, 20];
    console.log(table.table(rows, utils.getConfigForTable(widths)));
}

export function getSeveritiesToInclude(warnIfInvalid?: boolean): string[] {
    let severities: string[] = [];
    const severityThreshold = inputHelper.severityThreshold;
    if (severityThreshold) {
        switch (severityThreshold.toUpperCase()) {
            case SEVERITY_UNKNOWN:
                severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW, SEVERITY_UNKNOWN];
                break;
            case SEVERITY_LOW:
                severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW];
                break;
            case SEVERITY_MEDIUM:
                severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM];
                break;
            case SEVERITY_HIGH:
                severities = [SEVERITY_CRITICAL, SEVERITY_HIGH];
                break;
            case SEVERITY_CRITICAL:
                severities = [SEVERITY_CRITICAL];
                break;
            default:
                if (warnIfInvalid) {
                    core.warning("Invalid severity-threshold. Showing all the vulnerabilities.");
                }
                severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW, SEVERITY_UNKNOWN];
        }
    } else {
        if (warnIfInvalid) {
            core.warning("No severity-threshold provided. Showing all the vulnerabilities.");
        }
        severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW, SEVERITY_UNKNOWN];
    }

    return severities;
}

export function getFilteredOutput(): any {
    const vulnerabilities = getVulnerabilities();
    let filteredVulnerabilities = [];
    vulnerabilities.forEach((cve: any) => {
        let vulnObject = {
            "vulnerabilityId": cve[KEY_VULNERABILITY_ID],
            "packageName": cve[KEY_PACKAGE_NAME],
            "severity": cve[KEY_SEVERITY],
            "description": cve[KEY_DESCRIPTION],
            "target": cve[KEY_TARGET]
        };
        filteredVulnerabilities.push(vulnObject);
    });
    return filteredVulnerabilities;
}

async function getTrivyEnvVariables(): Promise<{ [key: string]: string }> {
    let trivyEnv: { [key: string]: string } = {};
    for (let key in process.env) {
        trivyEnv[key] = process.env[key] || "";
    }

    const username = inputHelper.username;
    const password = inputHelper.password;
    if (username && password) {
        trivyEnv["TRIVY_USERNAME"] = username;
        trivyEnv["TRIVY_PASSWORD"] = password;
    }

    trivyEnv["TRIVY_EXIT_CODE"] = TRIVY_EXIT_CODE.toString();
    trivyEnv["TRIVY_FORMAT"] = "json";
    trivyEnv["TRIVY_OUTPUT"] = getOutputPath();
    trivyEnv["GITHUB_TOKEN"] = inputHelper.githubToken;

    if (allowedlistHandler.trivyAllowedlistExists) {
        trivyEnv["TRIVY_IGNOREFILE"] = allowedlistHandler.getTrivyAllowedlist();
    }

    const severities = getSeveritiesToInclude(true);
    trivyEnv["TRIVY_SEVERITY"] = severities.join(',');

    return trivyEnv;
}

function getVulnerabilityIdsBySeverity(trivyStatus: number, removeDuplicates?: boolean): any {
    const severities = getSeveritiesToInclude();
    let vulnerabilityIdsBySeverity: any = {};

    if (trivyStatus == TRIVY_EXIT_CODE) {
        const vulnerabilities = getVulnerabilities(removeDuplicates);
        for (let severity of severities) {
            vulnerabilityIdsBySeverity[severity] = vulnerabilities
                .filter(v => v[KEY_SEVERITY].toUpperCase() === severity)
                .map(v => v[KEY_VULNERABILITY_ID]);
        }
    }

    return vulnerabilityIdsBySeverity;
}

function getTrivyOutput(): any {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}

function isOldTrivyJson(trivyOutputJson: any): boolean {
    return Array.isArray(trivyOutputJson);
}

function getTrivyResult(trivyOutputJson: any): any {
    return isOldTrivyJson(trivyOutputJson)
        ? trivyOutputJson
        : trivyOutputJson["Results"];
}

function getVulnerabilities(removeDuplicates?: boolean): any[] {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities: any[] = [];
    const trivyResult = getTrivyResult(trivyOutputJson);
    trivyResult.forEach((ele: any) => {
        if (ele && ele[KEY_VULNERABILITIES]) {
            let target = ele[KEY_TARGET];
            ele[KEY_VULNERABILITIES].forEach((cve: any) => {
                if (!removeDuplicates || !vulnerabilities.some(v => v[KEY_VULNERABILITY_ID] === cve[KEY_VULNERABILITY_ID])) {
                    cve[KEY_TARGET] = target;
                    vulnerabilities.push(cve);
                }
            });
        }
    });

    return vulnerabilities;
}

async function getLatestTrivyVersion(): Promise<string> {
    return toolCache.downloadTool(trivyLatestReleaseUrl).then((downloadPath) => {
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        if (!response.tag_name) {
            return stableTrivyVersion;
        }

        return semver.clean(response.tag_name);
    }, (error) => {
        core.warning(util.format("Failed to read latest trivy verison from %s. Using default stable version %s", trivyLatestReleaseUrl, stableTrivyVersion));
        return stableTrivyVersion;
    });
}

function getTrivyDownloadUrl(trivyVersion: string): string {
    const curOS = os.type();
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-64bit.tar.gz", trivyVersion, trivyVersion);

        case "Darwin":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-64bit.tar.gz", trivyVersion, trivyVersion);

        default:
            throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
    }
}

async function getTrivyExecOptions() {    
    const trivyEnv = await getTrivyEnvVariables();
    return {
        env: trivyEnv,
        ignoreReturnCode: true,
        outStream: fs.createWriteStream(getTrivyLogPath())
    };
}
