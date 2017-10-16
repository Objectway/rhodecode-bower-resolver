'use strict';

// Constants:
const ALPHA_NUMERIC_REVISION_REGEX = /^[a-f0-9]{4,40}$/;
const BRANCHES = 'branch';
const CLONE = 'clone';
const HG = 'git';
const HG_REGEX = /^git\+/i;
const NUMERIC_REVISION_REGEX = /^\d+$/;
const REVISION_FLAG = '-r';
const TAGS = 'tag';
const TRAILING_SLASHES = /\/+$/;
const UPDATE = 'checkout';

// Dependencies:
import child_process from 'child_process';
import Promise from 'bluebird';
import tmp from 'tmp';

export default {
    clone,
    branches,
    tags,
    update
};

var mSource, mDirectory;

function clone (source, directory) {
    mSource = source;
    mDirectory = directory;
    //source = `http://hermes.objectway.it/DigitalWealthXGroup/DigitalWealthXFrontEndGroup/${source}`;
    directory = directory || tmp.dirSync();
    return run({
        command: CLONE,
        args: [cleanSource(source), directory.name]
    });
}

function branches (directoryName) {
    return run({
        command: BRANCHES,
        cwd: directoryName,
    });
}

function tags (directoryName) {
    return run({
        command: TAGS,
        cwd: directoryName,
    });
}

function update (endpoint, directoryName) {
    let { target } = endpoint;
    let flags = [];

    if (NUMERIC_REVISION_REGEX.test(target) || ALPHA_NUMERIC_REVISION_REGEX.test(target)) {
        flags.push(REVISION_FLAG);
    }

    return run({
        command: UPDATE,
        args: flags.concat([endpoint.target]),
        cwd: directoryName
    });
}

function cleanSource (source) {
    return source
    // Change hg+ssh or hg+http or hg+https to ssh, http(s) respectively:
    .replace(HG_REGEX, '')
    // Remove trailing slashes:
    .replace(TRAILING_SLASHES, '');
}

function run (options) {
    let args = options.args || [];
    let command = options.command;
    let cwd = options.cwd || process.cwd();

    return new Promise((resolve, reject) => {
        console.log(`Executing... ${HG} ${[command].concat(args)} from ${cwd}`);
        let hg = child_process.spawn(HG, [command].concat(args), { cwd });

        let stdout = '';
        let stderr = '';
        hg.stdout.on('data', data => stdout += data.toString());
        hg.stderr.on('data', data => stderr += data.toString());
        hg.on('exit', () => resolve(stdout))
        hg.on('error', () => reject(stderr))
    });
}
