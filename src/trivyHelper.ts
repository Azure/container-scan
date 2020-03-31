import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as table from 'table';
import * as semver from 'semver';
import * as fileHelper from './fileHelper';
import * as inputHelper from './inputHelper';
import * as utils from './utils';

export const TRIVY_EXIT_CODE = 5;
const stableTrivyVersion = "0.5.2";
const trivyLatestReleaseUrl = "https://api.github.com/repos/aquasecurity/trivy/releases/latest";
const trivyToolName = "trivy";
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

export async function getTrivy(): Promise<string> {
    const latestTrivyVersion = await getLatestTrivyVersion();

    let cachedToolPath = toolCache.find(trivyToolName, latestTrivyVersion);
    if (!cachedToolPath) {
        let trivyDownloadPath;
        const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
        const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/trivy`;
        core.debug(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));

        try {
            trivyDownloadPath = await toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download trivy from %s", trivyDownloadUrl));
        }

        const untarredTrivyPath = await toolCache.extractTar(trivyDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredTrivyPath, trivyToolName, latestTrivyVersion);
    }

    const trivyToolPath = cachedToolPath + "/" + trivyToolName;
    fs.chmodSync(trivyToolPath, "777");

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
            summary = 'An error occured while scanning the container image for vulnerabilities';
            break;
    }

    return `- ${summary}`;
}

export function printFormattedOutput() {
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_PACKAGE_NAME, TITLE_SEVERITY, TITLE_DESCRIPTION];
    rows.push(titles);

    const vulnerabilities = getVulnerabilities();
    vulnerabilities.forEach((cve: any) => {
        let row = [];
        row.push(cve[KEY_VULNERABILITY_ID]);
        row.push(cve[KEY_PACKAGE_NAME]);
        row.push(cve[KEY_SEVERITY]);
        row.push(cve[KEY_DESCRIPTION]);
        rows.push(row);
    });

    let widths = [25, 20, 15, 60];
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

function getVulnerabilities(removeDuplicates?: boolean): any[] {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities: any[] = [];
    trivyOutputJson.forEach((ele: any) => {
        if (ele && ele[KEY_VULNERABILITIES]) {
            ele[KEY_VULNERABILITIES].forEach((cve: any) => {
                if (!removeDuplicates || !vulnerabilities.some(v => v[KEY_VULNERABILITY_ID] === cve[KEY_VULNERABILITY_ID])) {
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