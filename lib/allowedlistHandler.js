"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const jsyaml = __importStar(require("js-yaml"));
const fileHelper = __importStar(require("./fileHelper"));
let trivyAllowedlistPath = "";
let dockleAllowedlistPath = "";
exports.trivyAllowedlistExists = false;
function getTrivyAllowedlist() {
    if (exports.trivyAllowedlistExists)
        return trivyAllowedlistPath;
    else
        throw new Error("Could not find allowedlist file for common vulnerabilities");
}
exports.getTrivyAllowedlist = getTrivyAllowedlist;
function initializeTrivyAllowedlistPath() {
    trivyAllowedlistPath = `${fileHelper.getContainerScanDirectory()}/.trivyignore`;
}
function initializeDockleAllowedlistPath() {
    //Dockle expects .dockleignore file at the root of the repo 
    dockleAllowedlistPath = `${process.env['GITHUB_WORKSPACE']}/.dockleignore`;
}
function init() {
    let allowedlistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/allowedlist.yaml`;
    if (!fs.existsSync(allowedlistFilePath)) {
        allowedlistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/allowedlist.yml`;
        if (!fs.existsSync(allowedlistFilePath)) {
            console.log("Could not find allowedlist file.");
            return;
        }
    }
    initializeTrivyAllowedlistPath();
    initializeDockleAllowedlistPath();
    try {
        const allowedlistYaml = jsyaml.safeLoad(fs.readFileSync(allowedlistFilePath, 'utf8'));
        if (allowedlistYaml.general) {
            if (allowedlistYaml.general.vulnerabilities) {
                exports.trivyAllowedlistExists = true;
                const vulnArray = allowedlistYaml.general.vulnerabilities;
                const trivyAllowedlistContent = vulnArray.join("\n");
                fs.writeFileSync(trivyAllowedlistPath, trivyAllowedlistContent);
            }
            if (allowedlistYaml.general.bestPracticeViolations) {
                const vulnArray = allowedlistYaml.general.bestPracticeViolations;
                const dockleAllowedlistContent = vulnArray.join("\n");
                fs.writeFileSync(dockleAllowedlistPath, dockleAllowedlistContent);
            }
        }
    }
    catch (error) {
        throw new Error("Error while parsing allowedlist file. Error: " + error);
    }
}
exports.init = init;
