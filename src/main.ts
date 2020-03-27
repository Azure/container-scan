import * as core from '@actions/core';
import * as util from 'util';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { GitHubClient } from './githubClient';
import * as dockleHelper from './dockleHelper';
import * as inputHelper from './inputHelper';
import * as whitelistHandler from './whitelistHandler';
import * as trivyHelper from './trivyHelper';
import * as utils from './utils';

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

    trivyEnv["TRIVY_EXIT_CODE"] = trivyHelper.TRIVY_EXIT_CODE.toString();
    trivyEnv["TRIVY_FORMAT"] = "json";
    trivyEnv["TRIVY_OUTPUT"] = trivyHelper.getOutputPath();
    trivyEnv["GITHUB_TOKEN"] = inputHelper.githubToken;

    if (whitelistHandler.trivyWhitelistExists) {
        trivyEnv["TRIVY_IGNOREFILE"] = whitelistHandler.getTrivyWhitelist();
    }

    const severities = trivyHelper.getSeveritiesToInclude(true);
    trivyEnv["TRIVY_SEVERITY"] = severities.join(',');

    return trivyEnv;
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

async function runTrivy(): Promise<number> {
    const trivyPath = await trivyHelper.getTrivy();
    core.debug(util.format("Trivy executable found at path ", trivyPath));
    const trivyEnv = await getTrivyEnvVariables();

    const imageName = inputHelper.imageName;
    const trivyOptions: ExecOptions = {
        env: trivyEnv,
        ignoreReturnCode: true,
        silent: true
    };
    console.log("Scanning for vulnerabilties...");
    const trivyToolRunner = new ToolRunner(trivyPath, [imageName], trivyOptions);
    const trivyStatus = await trivyToolRunner.exec();
    return trivyStatus;
}

async function runDockle(): Promise<number> {
    const docklePath = await dockleHelper.getDockle();
    core.debug(util.format("Dockle executable found at path ", docklePath));
    const dockleEnv = await getDockleEnvVariables();
    const imageName = inputHelper.imageName;

    const dockleOptions: ExecOptions = {
        env: dockleEnv,
        ignoreReturnCode: true,
        silent: true
    };
    console.log("Scanning for CIS and best practice violations...");
    let dockleArgs = ['-f', 'json', '-o', dockleHelper.getOutputPath(), '--exit-level', dockleHelper.LEVEL_INFO, '--exit-code', dockleHelper.DOCKLE_EXIT_CODE.toString(), imageName];
    const dockleToolRunner = new ToolRunner(docklePath, dockleArgs, dockleOptions);
    const dockleStatus = await dockleToolRunner.exec();
    return dockleStatus;
}

async function run(): Promise<void> {
    whitelistHandler.init();
    const trivyStatus = await runTrivy();
    if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE) {
        trivyHelper.printFormattedOutput();
    } else if (trivyStatus === 0) {
        console.log("No vulnerabilities were detected in the container image");
    } else {
        throw new Error("An error occured while scanning the container image for vulnerabilities");
    }

    let dockleStatus: number;
    if (inputHelper.isCisChecksEnabled()) {
        dockleStatus = await runDockle();
        if (dockleStatus === dockleHelper.DOCKLE_EXIT_CODE) {
            dockleHelper.printFormattedOutput();
        } else if (dockleStatus === 0) {
            console.log("No best practice violations were detected in the container image");
        } else {
            throw new Error("An error occured while scanning the container image for best practice violations");
        }
    }

    try {
        const checkRunPayload = utils.getCheckRunPayloadWithScanResult(trivyStatus, dockleStatus);
        const githubClient = new GitHubClient(process.env.GITHUB_REPOSITORY, inputHelper.githubToken);
        await githubClient.createCheckRun(checkRunPayload);
    } catch (error) {
        core.warning(`An error occured while creating the check run for container scan. Error: ${error}`);
    }

    if (trivyStatus == trivyHelper.TRIVY_EXIT_CODE) {
        throw new Error("Vulnerabilities were detected in the container image");
    }
}

run().catch(error => core.setFailed(error.message));