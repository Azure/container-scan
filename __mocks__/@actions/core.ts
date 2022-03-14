const actionsCore = jest.requireActual('@actions/core');

let __mockInputValues = {
    'image-name': 'nginx',
    'token': 'token',
    'username': 'username',
    'password': 'password',
    'severit-threshold': 'HIGH',
    'run-quality-checks': 'true',
    'trivy-version': 'latest'
};

function __setMockInputValues(mockObject) {
    __mockInputValues = mockObject;
}

function getInput(input) {
    return __mockInputValues[input];
}

function debug(message) {
    console.log('MOCK-DEBUG:: ' + message);
}

function warning(message) {
    console.log('MOCK-WARN:: ' + message);
}

function error(message) {
    console.log('MOCK-ERROR:: ' + message);
}

actionsCore.__setMockInputValues = __setMockInputValues;
actionsCore.getInput = jest.fn(getInput);
actionsCore.debug = jest.fn(debug);
actionsCore.warning = jest.fn(warning);
actionsCore.error = jest.fn(error);

module.exports = actionsCore;