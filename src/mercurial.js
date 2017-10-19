'use strict';

// Constants:
const BRANCHES = 'branch';
const CLONE = 'clone';
const HG = 'git';
const HG_REGEX = /^git\+/i;
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

function clone (source, directory) {
    source = source.replace('http://hermes.objectway.it', 'http://hermes2.objectway.it:10003/');
    console.log(`CLONE ${source}`)
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
    //console.log(`Requiring tags for... ${directoryName}`);
    return run({
        command: TAGS,
        cwd: directoryName,
    });
}

function update (endpoint, directoryName) {
    return run({
        command: UPDATE,
        args: [endpoint.target],
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
