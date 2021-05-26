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
const core = __importStar(require("@actions/core"));
const dockleHelper = __importStar(require("./dockleHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const allowedlistHandler = __importStar(require("./allowedlistHandler"));
const trivyHelper = __importStar(require("./trivyHelper"));
const utils = __importStar(require("./utils"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        inputHelper.validateRequiredInputs();
        allowedlistHandler.init();
        const trivyResult = yield trivyHelper.runTrivy();
        const trivyStatus = trivyResult.status;
        if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE) {
            trivyHelper.printFormattedOutput();
        }
        else if (trivyStatus === 0) {
            console.log("No vulnerabilities were detected in the container image");
        }
        else {
            const errors = utils.extractErrorsFromLogs(trivyHelper.getTrivyLogPath(), trivyHelper.trivyToolName);
            errors.forEach(err => {
                core.error(err);
            });
            throw new Error(`An error occurred while scanning container image: ${inputHelper.imageName} for vulnerabilities.`);
        }
        let dockleStatus;
        if (inputHelper.isRunQualityChecksEnabled()) {
            dockleStatus = yield dockleHelper.runDockle();
            if (dockleStatus === dockleHelper.DOCKLE_EXIT_CODE) {
                dockleHelper.printFormattedOutput();
            }
            else if (dockleStatus === 0) {
                console.log("No best practice violations were detected in the container image");
            }
            else {
                const errors = utils.extractErrorsFromLogs(dockleHelper.getDockleLogPath(), dockleHelper.dockleToolName);
                errors.forEach(err => {
                    core.error(err);
                });
                throw new Error("An error occurred while scanning the container image for best practice violations");
            }
        }
        try {
            yield utils.createScanResult(trivyStatus, dockleStatus);
        }
        catch (error) {
            core.warning(`An error occurred while creating the check run for container scan. Error: ${error}`);
        }
        const scanReportPath = utils.getScanReport(trivyResult, dockleStatus);
        core.setOutput('scan-report-path', scanReportPath);
        if (trivyStatus == trivyHelper.TRIVY_EXIT_CODE) {
            throw new Error("Vulnerabilities were detected in the container image");
        }
    });
}
exports.run = run;
run().catch(error => core.setFailed(error.message));
