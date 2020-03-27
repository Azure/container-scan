import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as table from 'table';
import * as semver from 'semver';
import * as fileHelper from './fileHelper';
import * as utils from './utils';

export const DOCKLE_EXIT_CODE = 5;
export const LEVEL_INFO = "INFO";
const stableDockleVersion = "0.2.4";
const dockleLatestReleaseUrl = "https://api.github.com/repos/goodwithtech/dockle/releases/latest";
const dockleToolName = "dockle";
const KEY_DETAILS = "details";
const KEY_CODE = "code";
const KEY_TITLE = "title";
const KEY_LEVEL = "level";
const KEY_ALERTS = "alerts";
const LEVEL_FATAL = "FATAL";
const LEVEL_WARN = "WARN";
const LEVEL_IGNORE = "IGNORE";
const LEVEL_SKIP = "SKIP";
const TITLE_COUNT = "COUNT";
const TITLE_LEVEL = "LEVEL";
const TITLE_VULNERABILITY_ID = "VULNERABILITY ID";
const TITLE_TITLE = "TITLE";
const TITLE_SEVERITY = "SEVERITY";
const TITLE_DESCRIPTION = "DESCRIPTION";

export async function getDockle(): Promise<string> {
    const latestDockleVersion = await getLatestDockleVersion();
    let cachedToolPath = toolCache.find(dockleToolName, latestDockleVersion);
    if (!cachedToolPath) {
        let dockleDownloadPath;
        const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
        const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
        core.debug(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));

        try {
            dockleDownloadPath = await toolCache.downloadTool(dockleDownloadUrl, dockleDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download dockle from %s", dockleDownloadUrl));
        }

        const untarredDocklePath = await toolCache.extractTar(dockleDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredDocklePath, dockleToolName, latestDockleVersion);
    }

    const dockleToolPath = cachedToolPath + "/" + dockleToolName;
    fs.chmodSync(dockleToolPath, "777");

    return dockleToolPath;
}

export function getOutputPath(): string {
    const dockleOutputPath = `${fileHelper.getContainerScanDirectory()}/dockleoutput.json`;
    return dockleOutputPath;
}

export function getSummary(dockleStatus: number): string {
    let summary = '';
    switch (dockleStatus) {
        case 0:
            summary = 'No CIS benchmark violations were detected in the container image.'
            break;
        case DOCKLE_EXIT_CODE:
            summary = getCisSummary();
            break;
        default:
            summary = 'An error occured while scanning the container image for CIS benchmark violations.';
            break;
    }

    return `- ${summary}`;
}

export function getText(dockleStatus: number): string {
    let clusteredViolations = '';
    const cisIdsByLevel = getCisIdsByLevel(dockleStatus);
    for (let level in cisIdsByLevel) {
        if (cisIdsByLevel[level].length > 0) {
            clusteredViolations = `${clusteredViolations}\n- **${level}**:\n${cisIdsByLevel[level].join('\n')}`;
        }
    }
    return `**Best Practices Violations** -${clusteredViolations ? clusteredViolations : '\nNone found.'}`;
}

function getLevelsToInclude(): string[] {
    return [LEVEL_FATAL, LEVEL_WARN, LEVEL_INFO];
}

function getCisIdsByLevel(dockleStatus: number): any {
    const levels: string[] = getLevelsToInclude();
    let cisIdsByLevel: any = {};
    if (dockleStatus === DOCKLE_EXIT_CODE) {
        const dockleOutputJson = getDockleOutput();
        const dockleDetails = dockleOutputJson['details'];
        for (let level of levels) {
            cisIdsByLevel[level] = dockleDetails
                .filter(dd => dd['level'].toUpperCase() === level)
                .map(dd => dd['code']);
        }
    }

    return cisIdsByLevel;
}

function getDockleOutput(): any {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}

function getCisSummary(): any {
    const dockleOutputJson = getDockleOutput();
    let cisSummary = 'Best practices test summary -';
    const dockleSummary = dockleOutputJson['summary'];
    const includedLevels = getLevelsToInclude();
    if (dockleSummary) {
        for (let level in dockleSummary) {
            if (includedLevels.includes(level.toUpperCase())) {
                const levelCount = dockleSummary[level];
                const isBold = levelCount > 0;
                cisSummary = isBold
                    ? `${cisSummary}\n**${level.toUpperCase()}**: **${dockleSummary[level]}**`
                    : `${cisSummary}\n${level.toUpperCase()}: ${dockleSummary[level]}`;
            }
        }
    }

    return cisSummary;
}

async function getLatestDockleVersion(): Promise<string> {
    return toolCache.downloadTool(dockleLatestReleaseUrl).then((downloadPath) => {
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        if (!response.tag_name) {
            return stableDockleVersion;
        }

        return semver.clean(response.tag_name);
    }, (error) => {
        core.warning(util.format("Failed to read latest dockle verison from %s. Using default stable version %s", dockleLatestReleaseUrl, stableDockleVersion));
        return stableDockleVersion;
    });
}

function getDockleDownloadUrl(dockleVersion: string): string {
    const curOS = os.type();
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-64bit.tar.gz", dockleVersion, dockleVersion);

        case "Darwin":
            return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_macOS-64bit.tar.gz", dockleVersion, dockleVersion);

        default:
            throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
    }
}

export function printFormattedOutput() {
    const dockleOutputJson = getDockleOutput();
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_TITLE, TITLE_SEVERITY, TITLE_DESCRIPTION];
    rows.push(titles);
    dockleOutputJson[KEY_DETAILS].forEach(ele => {
        if (ele[KEY_LEVEL] != LEVEL_IGNORE) {
            let row = [];
            row.push(ele[KEY_CODE]);
            row.push(ele[KEY_TITLE]);
            row.push(ele[KEY_LEVEL]);
            row.push(ele[KEY_ALERTS][0]);
            rows.push(row);
        }
    });

    let widths = [25, 25, 15, 55];
    console.log(table.table(rows, utils.getConfigForTable(widths)));
}