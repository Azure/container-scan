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
const fileHelper = __importStar(require("./fileHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const utils = __importStar(require("./utils"));
exports.TRIVY_EXIT_CODE = 5;
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
function getTrivy() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestTrivyVersion = yield getLatestTrivyVersion();
        let cachedToolPath = toolCache.find(trivyToolName, latestTrivyVersion);
        if (!cachedToolPath) {
            let trivyDownloadPath;
            const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
            const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/trivy`;
            core.debug(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));
            try {
                trivyDownloadPath = yield toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
            }
            catch (error) {
                throw new Error(util.format("Failed to download trivy from %s", trivyDownloadUrl));
            }
            const untarredTrivyPath = yield toolCache.extractTar(trivyDownloadPath);
            cachedToolPath = yield toolCache.cacheDir(untarredTrivyPath, trivyToolName, latestTrivyVersion);
        }
        const trivyToolPath = cachedToolPath + "/" + trivyToolName;
        fs.chmodSync(trivyToolPath, "777");
        return trivyToolPath;
    });
}
exports.getTrivy = getTrivy;
function getOutputPath() {
    const trivyOutputPath = `${fileHelper.getContainerScanDirectory()}/trivyoutput.json`;
    return trivyOutputPath;
}
exports.getOutputPath = getOutputPath;
function getTrivyLogPath() {
    const trivyLogPath = `${fileHelper.getContainerScanDirectory()}/trivylog`;
    return trivyLogPath;
}
exports.getTrivyLogPath = getTrivyLogPath;
function getText(trivyStatus) {
    let clusteredVulnerabilities = '';
    const vulnerabilityIdsBySeverity = getVulnerabilityIdsBySeverity(trivyStatus, true);
    for (let severity in vulnerabilityIdsBySeverity) {
        if (vulnerabilityIdsBySeverity[severity].length > 0) {
            clusteredVulnerabilities = `${clusteredVulnerabilities}\n- **${severity}**:\n${vulnerabilityIdsBySeverity[severity].join('\n')}`;
        }
    }
    return `**Vulnerabilities** -${clusteredVulnerabilities ? clusteredVulnerabilities : '\nNone found.'}`;
}
exports.getText = getText;
function getSummary(trivyStatus) {
    let summary = '';
    switch (trivyStatus) {
        case 0:
            summary = 'No vulnerabilities were detected in the container image';
            break;
        case exports.TRIVY_EXIT_CODE:
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
exports.getSummary = getSummary;
function printFormattedOutput() {
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_PACKAGE_NAME, TITLE_SEVERITY, TITLE_DESCRIPTION];
    rows.push(titles);
    const vulnerabilities = getVulnerabilities();
    vulnerabilities.forEach((cve) => {
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
exports.printFormattedOutput = printFormattedOutput;
function getSeveritiesToInclude(warnIfInvalid) {
    let severities = [];
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
    }
    else {
        if (warnIfInvalid) {
            core.warning("No severity-threshold provided. Showing all the vulnerabilities.");
        }
        severities = [SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW, SEVERITY_UNKNOWN];
    }
    return severities;
}
exports.getSeveritiesToInclude = getSeveritiesToInclude;
function getVulnerabilityIdsBySeverity(trivyStatus, removeDuplicates) {
    const severities = getSeveritiesToInclude();
    let vulnerabilityIdsBySeverity = {};
    if (trivyStatus == exports.TRIVY_EXIT_CODE) {
        const vulnerabilities = getVulnerabilities(removeDuplicates);
        for (let severity of severities) {
            vulnerabilityIdsBySeverity[severity] = vulnerabilities
                .filter(v => v[KEY_SEVERITY].toUpperCase() === severity)
                .map(v => v[KEY_VULNERABILITY_ID]);
        }
    }
    return vulnerabilityIdsBySeverity;
}
function getTrivyOutput() {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}
function getVulnerabilities(removeDuplicates) {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities = [];
    trivyOutputJson.forEach((ele) => {
        if (ele && ele[KEY_VULNERABILITIES]) {
            ele[KEY_VULNERABILITIES].forEach((cve) => {
                if (!removeDuplicates || !vulnerabilities.some(v => v[KEY_VULNERABILITY_ID] === cve[KEY_VULNERABILITY_ID])) {
                    vulnerabilities.push(cve);
                }
            });
        }
    });
    return vulnerabilities;
}
function getLatestTrivyVersion() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function getTrivyDownloadUrl(trivyVersion) {
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
