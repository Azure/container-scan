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
const os = __importStar(require("os"));
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const table = __importStar(require("table"));
const semver = __importStar(require("semver"));
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const fileHelper = __importStar(require("./fileHelper"));
const utils = __importStar(require("./utils"));
const inputHelper = __importStar(require("./inputHelper"));
exports.DOCKLE_EXIT_CODE = 5;
exports.LEVEL_INFO = "INFO";
exports.dockleToolName = "dockle";
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
function runDockle() {
    return __awaiter(this, void 0, void 0, function* () {
        const docklePath = yield getDockle();
        const imageName = inputHelper.imageName;
        const dockleOptions = yield getDockleExecOptions();
        console.log("Scanning for CIS and best practice violations...");
        let dockleArgs = ['-f', 'json', '-o', getOutputPath(), '--exit-level', exports.LEVEL_INFO, '--exit-code', exports.DOCKLE_EXIT_CODE.toString(), imageName];
        const dockleToolRunner = new toolrunner_1.ToolRunner(docklePath, dockleArgs, dockleOptions);
        const dockleStatus = yield dockleToolRunner.exec();
        utils.addLogsToDebug(getDockleLogPath());
        return dockleStatus;
    });
}
exports.runDockle = runDockle;
function getDockle() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestDockleVersion = yield getLatestDockleVersion();
        let cachedToolPath = toolCache.find(exports.dockleToolName, latestDockleVersion);
        if (!cachedToolPath) {
            let dockleDownloadPath;
            const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
            const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
            core.debug(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));
            try {
                dockleDownloadPath = yield toolCache.downloadTool(dockleDownloadUrl, dockleDownloadDir);
            }
            catch (error) {
                throw new Error(util.format("Failed to download dockle from %s", dockleDownloadUrl));
            }
            const untarredDocklePath = yield toolCache.extractTar(dockleDownloadPath);
            cachedToolPath = yield toolCache.cacheDir(untarredDocklePath, exports.dockleToolName, latestDockleVersion);
        }
        const dockleToolPath = cachedToolPath + "/" + exports.dockleToolName;
        fs.chmodSync(dockleToolPath, "777");
        core.debug(util.format("Dockle executable found at path ", dockleToolPath));
        return dockleToolPath;
    });
}
exports.getDockle = getDockle;
function getOutputPath() {
    const dockleOutputPath = `${fileHelper.getContainerScanDirectory()}/dockleoutput.json`;
    return dockleOutputPath;
}
exports.getOutputPath = getOutputPath;
function getDockleLogPath() {
    const dockleLogPath = `${fileHelper.getContainerScanDirectory()}/docklelog`;
    return dockleLogPath;
}
exports.getDockleLogPath = getDockleLogPath;
function getSummary(dockleStatus) {
    let summary = '';
    switch (dockleStatus) {
        case 0:
            summary = 'No CIS benchmark violations were detected in the container image.';
            break;
        case exports.DOCKLE_EXIT_CODE:
            summary = getCisSummary();
            break;
        default:
            summary = 'An error occurred while scanning the container image for CIS benchmark violations.';
            break;
    }
    return `- ${summary}`;
}
exports.getSummary = getSummary;
function getText(dockleStatus) {
    let clusteredViolations = '';
    const cisIdsByLevel = getCisIdsByLevel(dockleStatus);
    for (let level in cisIdsByLevel) {
        if (cisIdsByLevel[level].length > 0) {
            clusteredViolations = `${clusteredViolations}\n- **${level}**:\n${cisIdsByLevel[level].join('\n')}`;
        }
    }
    return `**Best Practices Violations** -${clusteredViolations ? clusteredViolations : '\nNone found.'}`;
}
exports.getText = getText;
function getFilteredOutput() {
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
exports.getFilteredOutput = getFilteredOutput;
function getDockleEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        let dockleEnv = {};
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
    });
}
function getLevelsToInclude() {
    return [LEVEL_FATAL, LEVEL_WARN, exports.LEVEL_INFO];
}
function getCisIdsByLevel(dockleStatus) {
    const levels = getLevelsToInclude();
    let cisIdsByLevel = {};
    if (dockleStatus === exports.DOCKLE_EXIT_CODE) {
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
function getDockleOutput() {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}
function getCisSummary() {
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
function getLatestDockleVersion() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function getDockleDownloadUrl(dockleVersion) {
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
function getDockleExecOptions() {
    return __awaiter(this, void 0, void 0, function* () {
        const dockleEnv = yield getDockleEnvVariables();
        return {
            env: dockleEnv,
            ignoreReturnCode: true,
            outStream: fs.createWriteStream(getDockleLogPath())
        };
    });
}
function printFormattedOutput() {
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
exports.printFormattedOutput = printFormattedOutput;
