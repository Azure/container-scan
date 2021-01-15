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
import * as utils from './utils';
import * as inputHelper from './inputHelper';

export const DOCKLE_EXIT_CODE = 5;
export const LEVEL_INFO = "INFO";
export const dockleToolName = "dockle";
const stableDockleVersion = "0.2.4";
const dockleLatestReleaseUrl = "https://api.github.com/repos/goodwithtech/dockle/releases/latest";
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

export async function runDockle(): Promise<number> {
    const docklePath = await getDockle();
    const imageName = inputHelper.imageName;

    const dockleOptions: ExecOptions = await getDockleExecOptions();
    console.log("Scanning for CIS and best practice violations...");
    let dockleArgs = ['-f', 'json', '-o', getOutputPath(), '--exit-level', LEVEL_INFO, '--exit-code', DOCKLE_EXIT_CODE.toString(), imageName];
    const dockleToolRunner = new ToolRunner(docklePath, dockleArgs, dockleOptions);
    const dockleStatus = await dockleToolRunner.exec();
    utils.addLogsToDebug(getDockleLogPath());
    return dockleStatus;
}

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

    core.debug(util.format("Dockle executable found at path ", dockleToolPath));
    return dockleToolPath;
}

export function getOutputPath(): string {
    const dockleOutputPath = `${fileHelper.getContainerScanDirectory()}/dockleoutput.json`;
    return dockleOutputPath;
}

export function getDockleLogPath(): string {
    const dockleLogPath = `${fileHelper.getContainerScanDirectory()}/docklelog`;
    return dockleLogPath;
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
            summary = 'An error occurred while scanning the container image for CIS benchmark violations.';
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

export function getFilteredOutput(): any {
    const dockleOutputJson = getDockleOutput();
    let filteredVulnerabilities = [];
    dockleOutputJson[KEY_DETAILS].forEach(cis => {
        if (cis[KEY_LEVEL] != LEVEL_IGNORE) {
            let vulnObject = {
                [KEY_CODE]: cis[KEY_CODE],
                [KEY_TITLE]: cis[KEY_TITLE],
                [KEY_LEVEL]: cis[KEY_LEVEL],
                [KEY_ALERTS]: cis[KEY_ALERTS][0]
            };
            filteredVulnerabilities.push(vulnObject);
        }
    });
    return filteredVulnerabilities;
}

async function getDockleEnvVariables(): Promise<{ [key: string]: string }> {
    let dockleEnv: { [key: string]: string } = {};
    for (let key in process.env) {
        dockleEnv[key] = process.env[key] || "";
    }

    const username = inputHelper.username;
    const password = inputHelper.password;
    if (username && password) {
        dockleEnv["DOCKLE_USERNAME"] = username;
        dockleEnv["DOCKLE_PASSWORD"] = password;
    }

    return dockleEnv;
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

async function getDockleExecOptions()
{
    const dockleEnv = await getDockleEnvVariables();
    return {
        env: dockleEnv,
        ignoreReturnCode: true,
        outStream: fs.createWriteStream(getDockleLogPath())
    };
}

export function printFormattedOutput() {
    const dockleOutputJson = getDockleOutput();
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_TITLE, TITLE_SEVERITY, TITLE_DESCRIPTION];
    rows.push(titles);
    dockleOutputJson[KEY_DETAILS].forEach(cis => {
        if (cis[KEY_LEVEL] != LEVEL_IGNORE) {
            let row = [];
            row.push(cis[KEY_CODE]);
            row.push(cis[KEY_TITLE]);
            row.push(cis[KEY_LEVEL]);
            row.push(cis[KEY_ALERTS][0]);
            rows.push(row);
        }
    });

    let widths = [25, 25, 15, 55];
    console.log(table.table(rows, utils.getConfigForTable(widths)));
}