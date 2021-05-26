import * as core from '@actions/core';
import * as dockleHelper from './dockleHelper';
import * as inputHelper from './inputHelper';
import * as allowedlistHandler from './allowedlistHandler';
import * as trivyHelper from './trivyHelper';
import * as utils from './utils';

export async function run(): Promise<void> {
    inputHelper.validateRequiredInputs();
    allowedlistHandler.init();
    const trivyResult = await trivyHelper.runTrivy();
    const trivyStatus = trivyResult.status;

    if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE) {
        trivyHelper.printFormattedOutput();
    } else if (trivyStatus === 0) {
        console.log("No vulnerabilities were detected in the container image");
    } else {
        const errors = utils.extractErrorsFromLogs(trivyHelper.getTrivyLogPath(), trivyHelper.trivyToolName);

        errors.forEach(err => {
            core.error(err);
        });
        throw new Error(`An error occurred while scanning container image: ${inputHelper.imageName} for vulnerabilities.`);
    }

    let dockleStatus: number;
    if (inputHelper.isRunQualityChecksEnabled()) {
        dockleStatus = await dockleHelper.runDockle();
        if (dockleStatus === dockleHelper.DOCKLE_EXIT_CODE) {
            dockleHelper.printFormattedOutput();
        } else if (dockleStatus === 0) {
            console.log("No best practice violations were detected in the container image");
        } else {
            const errors = utils.extractErrorsFromLogs(dockleHelper.getDockleLogPath(), dockleHelper.dockleToolName);
            errors.forEach(err => {
                core.error(err);
            });
            throw new Error("An error occurred while scanning the container image for best practice violations");
        }
    }

    try {
        await utils.createScanResult(trivyStatus, dockleStatus);
    } catch (error) {
        core.warning(`An error occurred while creating the check run for container scan. Error: ${error}`);
    }

    const scanReportPath = utils.getScanReport(trivyResult, dockleStatus);
    core.setOutput('scan-report-path', scanReportPath);

    if (trivyStatus == trivyHelper.TRIVY_EXIT_CODE) {
        throw new Error("Vulnerabilities were detected in the container image");
    }
}

run().catch(error => core.setFailed(error.message));