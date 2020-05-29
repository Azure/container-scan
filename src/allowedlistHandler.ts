import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import * as fileHelper from './fileHelper';

let trivyAllowedlistPath = "";
let dockleAllowedlistPath = "";
export let trivyAllowedlistExists = false;

export function getTrivyAllowedlist(): string {
    if (trivyAllowedlistExists)
        return trivyAllowedlistPath;
    else
        throw new Error("Could not find allowedlist file for common vulnerabilities");
}

function initializeTrivyAllowedlistPath() {
    trivyAllowedlistPath = `${fileHelper.getContainerScanDirectory()}/.trivyignore`;
}

function initializeDockleAllowedlistPath() {
    //Dockle expects .dockleignore file at the root of the repo 
    dockleAllowedlistPath = `${process.env['GITHUB_WORKSPACE']}/.dockleignore`;
}

export function init() {
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
                trivyAllowedlistExists = true;
                const vulnArray: string[] = allowedlistYaml.general.vulnerabilities;
                const trivyAllowedlistContent = vulnArray.join("\n");
                fs.writeFileSync(trivyAllowedlistPath, trivyAllowedlistContent);
            }
            if (allowedlistYaml.general.bestPracticeViolations) {
                const vulnArray: string[] = allowedlistYaml.general.bestPracticeViolations;
                const dockleAllowedlistContent = vulnArray.join("\n");
                fs.writeFileSync(dockleAllowedlistPath, dockleAllowedlistContent);
            }
        }
    } catch (error) {
        throw new Error("Error while parsing allowedlist file. Error: " + error);
    }
}