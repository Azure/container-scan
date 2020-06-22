const os = jest.genMockFromModule<any>('os');

let curOs = 'Linux';

function __setOs(newOs) {
    curOs = newOs;
}

function type() {
    return curOs;
}

os.__setOs = __setOs;
os.type = jest.fn(type);

module.exports = os;