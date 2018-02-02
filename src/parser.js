'use strict';

// Constants:
const DEFAULT_TARGET = 'master';
const DEFAULT_VERSION = '1.0.0';
const NEW_LINE_REGEX = /[\r\n]+/;
const TAG_REGEX = /(v*[\w\d\.\-_]+)/i; // /([^\s]+)\s+(\d+):([0-9a-f]+)/i;
const BRANCH_REGEX = /([\w\d\.\-_]+)/i;

// Dependencies:
import semver from 'semver';

export default {
    versions
};

function versions (branches, tags) {
    // console.log(`VERSIONS METHOD :: Returning BRANCHES --> ${branches}`);
    // console.log(`VERSIONS METHOD :: Returning TAGS --> ${tags}`);
    //let versions = parseBranch(branches).concat(parseTag(tags));
    let versions = parseTag(tags);
    versions = versions.filter(Boolean);
    //console.log(`VERSIONS METHOD :: Returning ${versions.toString()}`);
    return versions.length ? versions : [{
        version: DEFAULT_VERSION,
        target: DEFAULT_TARGET
    }];
}

// output can be <tag_name>
function parseTag(output) {
    // console.log(`parseTag method for -> ${output} <-`);

    let lines = (output) ? output.trim().split(NEW_LINE_REGEX) : [];
    return lines.map((line) => {
        // console.log(`PARSE_TAG METHOD :: Parsing ${line}`);
        let parsed = line.match(TAG_REGEX);
        // console.log(`PARSE_TAG METHOD :: parsed ${parsed}`);
        if (parsed) {
            //console.log(`PARSE_TAG METHOD :: Parsing ${line} :: Parsed -> ${parsed}`);
            let [match, version, target] = parsed;
            // console.log(`PARSE_TAG METHOD :: Match: ${match}, Target: ${target}, Version: ${version}`);
            //console.log(`PARSO ${semver.parse(version)}`);
            //if (semver.parse(version)) {
                if(match.startsWith('v')) {
                    // We have some repo tagget with v others not.
                    //console.log(`PARSE_TAG METHOD :: Parsing ${line} :: Parsed Version -> ${match.substring(1, match.length)} with target ${match}`);
                    return { target: match, version: match.substring(1, match.length)};
                } else {
                    //console.log(`PARSE_TAG METHOD :: Parsing ${line} :: Parsed Version -> ${match} with target ${match}`);
                    return { target: 'v'+match, version: match};
                }
            //} else {
            //    console.log(`PARSE_TAG METHOD :: Skipping parsing... `);
            //}
        }
    });
}

// output can be <branch_name>
function parseBranch(output) {
    //console.log(`ParseBranch method for ${output}`);
    let lines = (output) ? output.trim().split(NEW_LINE_REGEX) : [];
    return lines.map((line) => {
        //console.log(`PARSE_BRANCH METHOD :: Parsing ${line}`);
        let parsed = line.match(BRANCH_REGEX);
        //console.log(`PARSE_BRANCH METHOD :: parsed ${parsed}`);
        if (parsed) {
            //console.log(`PARSE_BRANCH METHOD :: Parsing ${line} :: Parsed -> ${parsed}`);
            let [match, version, target] = parsed;
            return {version, target: version};
            // if (semver.parse(version)) {
            //     console.log(`PARSE_BRANCH METHOD :: Parsing ${line} :: Parsed Version -> ${version} with target ${target}`);
            //     return { version, target };
            // }
        }
    });
}