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
exports.githubToken = core.getInput("github-token");
exports.username = core.getInput("username");
exports.password = core.getInput("password");
exports.severityThreshold = core.getInput("severity-threshold");
exports.addCISChecks = core.getInput("add-CIS-checks");
function isCisChecksEnabled() {
    return exports.addCISChecks.toLowerCase() === "true";
}
exports.isCisChecksEnabled = isCisChecksEnabled;
