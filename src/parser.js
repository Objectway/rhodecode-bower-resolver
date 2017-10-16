'use strict';

// Constants:
const DEFAULT_TARGET = 'master';
const DEFAULT_VERSION = '0.0.0';
const NEW_LINE_REGEX = /[\r\n]+/;
const TAG_REGEX = /(v*[\w\d\.\-_]+)/i; // /([^\s]+)\s+(\d+):([0-9a-f]+)/i;
const BRANCH_REGEX = /([\w\d\.\-_]+)/i;

// Dependencies:
import semver from 'semver';

export default {
    versions
};

function versions (branches, tags) {
    //let versions = parseBranch(branches).concat(parseTag(tags));
    let versions = parseTag(tags);
    versions = versions.filter(Boolean);
    console.log(`VERSIONS METHOD :: Returning ${versions.toString()}`);
    return versions.length ? versions : [{
        version: DEFAULT_VERSION,
        target: DEFAULT_TARGET
    }];
}

// output can be <tag_name>
function parseTag(output) {
    console.log(`parseTag method for ${output}`);

    // TODO
    let lines = (output) ? output.trim().split(NEW_LINE_REGEX) : [];
    return lines.map((line) => {
        console.log(`PARSE_TAG METHOD :: Parsing ${line}`);
        let parsed = line.match(TAG_REGEX);
        console.log(`PARSE_TAG METHOD :: parsed ${parsed}`);
        if (parsed) {
            console.log(`PARSE_TAG METHOD :: Parsing ${line} :: Parsed -> ${parsed}`);
            let [match, version, target] = parsed;
            console.log(`PARSE_TAG METHOD :: Returning version ${match} and target ${match.substring(1, match.length)}`);
            return { target: match, version: match.substring(1, match.length)};
            // if (semver.parse(version)) {
            //     console.log(`PARSE_TAG METHOD :: Parsing ${line} :: Parsed Version -> ${version} with target ${target}`);
            //     return { version, target: match };
            // }
        }
    });
}

// output can be <branch_name>
function parseBranch(output) {
    console.log(`ParseBranch method for ${output}`);

    // TODO
    let lines = (output) ? output.trim().split(NEW_LINE_REGEX) : [];
    return lines.map((line) => {
        console.log(`PARSE_BRANCH METHOD :: Parsing ${line}`);
        let parsed = line.match(BRANCH_REGEX);
        console.log(`PARSE_BRANCH METHOD :: parsed ${parsed}`);
        if (parsed) {
            console.log(`PARSE_BRANCH METHOD :: Parsing ${line} :: Parsed -> ${parsed}`);
            let [match, version, target] = parsed;
            return {version, target: version};
            // if (semver.parse(version)) {
            //     console.log(`PARSE_BRANCH METHOD :: Parsing ${line} :: Parsed Version -> ${version} with target ${target}`);
            //     return { version, target };
            // }
        }
    });
}