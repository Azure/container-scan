"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
exports.imageName = core.getInput("image-name");
exports.githubToken = core.getInput("token");
exports.username = core.getInput("username");
exports.password = core.getInput("password");
exports.trivyVersion = core.getInput("trivy-version");
exports.severityThreshold = core.getInput("severity-threshold");
exports.runQualityChecks = core.getInput("run-quality-checks");
function isRunQualityChecksEnabled() {
    return exports.runQualityChecks.toLowerCase() === "true";
}
exports.isRunQualityChecksEnabled = isRunQualityChecksEnabled;
function validateRequiredInputs() {
    if (!exports.imageName)
        throw new Error("Could not find required input: image-name");
    if (!exports.githubToken)
        throw new Error("'token' input is not supplied. Set it to a PAT/GITHUB_TOKEN");
}
exports.validateRequiredInputs = validateRequiredInputs;
