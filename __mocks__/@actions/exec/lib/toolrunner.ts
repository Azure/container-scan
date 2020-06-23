var __exitCode = 0;
    
function __setExitCode(exitCode) {
    __exitCode = exitCode;
}

class ToolRunner {
    constructor(toolPath, args, options) {
        console.log('ToolRunner constructor called');
    }
    
    exec() {
        return __exitCode;
    }
}

var toolrunner = {
    __setExitCode: __setExitCode,
    ToolRunner: ToolRunner
}

module.exports = toolrunner;