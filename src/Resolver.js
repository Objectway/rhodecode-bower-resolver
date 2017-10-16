'use strict';

// Constants:
const SOURCE_MATCH_REGEX = /^git\+(ssh|https?):\/\//i

// Dependencies:
import mercurial from './mercurial';
// --- useless after rework
import spawnCommand from 'spawn-command';
import readChunk from 'read-chunk';
import FileType from 'file-type';
import AdmZip from 'adm-zip';
import tmp from 'tmp';
import request from 'request';
//---- ./ end useless
import parser from './parser';
import Promise from 'bluebird';
import Q from 'q';
import RegistryClient from 'bower-registry-client';

// Errors:
const BRANCHES_ERROR = 'EHGBRANCHES';
const CLONE_ERROR = 'EHGCLONE';
const TAGS_ERROR = 'EHGTAGS';
const UPDATE_ERROR = 'EHGUPDATE';

let registryClient;
let packageUrl = '';
let bower;

export default class Resolver {

    constructor (bowerLocal) {
        bower = bowerLocal;
        this.bower = bowerLocal;

        // Check bowerRC configuration file
        console.log('bower config', bower.config);
        if (!bower.config.hasOwnProperty('rhodecode') || !bower.config.rhodecode.hasOwnProperty('repo') || !bower.config.rhodecode.hasOwnProperty('token')) {
            bower.logger.error("bower-rhodecode-resolver", "Invalid settings in your .bowerrc file, check you have this properties: \n\"rhodecode\": {\n\t\"repo\": \"www.myrepo.com\",\n\t\"token\": \"asdfghjkl1234567890\"\n}");
            process.exit();
        }
        registryClient = new RegistryClient(bowerLocal.config, console);
    }

    // Match method tells whether resolver supports given source
    // It can return either boolean or promise of boolean
    match (source) {
        //console.log(`> Starting match method for -> ${source}...`);
        packageUrl = source;

        if (source && source.indexOf(bower.config.rhodecode.repo) != -1) {
            //console.log(`> Match method :: Discovered -> ${source}...`);
            return true;
        }
        console.log(`> Match method :: Creating promise for -> ${source} ...`);

        return Q.nfcall(registryClient.lookup.bind(registryClient), source).then( (entry) => {
            //console.log(`> Match method :: Promise Resolved for -> ${source} :: ... ${JSON.stringify(entry)}`);
            // If entry starts with hermes then use this resolver to get the bower package otherwise return false
            // and use standard bower resolution.
            if ( entry && entry.url && entry.url.startsWith(bower.config.rhodecode.repo) ) {
                packageUrl = entry.url;
                return true
            }
            return false;
        });

        //return SOURCE_MATCH_REGEX.test(source);
    }

    // Optional:
    // Can resolve or normalize sources, like:
    // "jquery" => "git://github.com/jquery/jquery.git"
    locate (source) {
        return packageUrl;
    }

    // Optional:
    // Allows to list available versions of given source.
    // Bower chooses matching release and passes it to "fetch"
    releases (source) {
        var deferred = Q.defer(),
            gitLsRemote = spawnCommand("git ls-remote --tags " + source),
            gitLsRemoteOutput = source + ' ';


        gitLsRemote.stdout.on('data', function (data) {
            gitLsRemoteOutput += data.toString('utf8');
        });

        gitLsRemote.stdout.on('finish', function () {
            //bower.logger.debug('RHODECODE RESOLVER: Invoking finish callback...');
            try {
                var tags = gitLsRemoteOutput.match(/(^.+tags[\/\\][^\s\^]+$)/gm);
                if(tags === null) {
                    tags = [];
                } else {
                    tags = tags.map(function(tag) {
                        var _tag = tag.replace(/^.+tags[\/\\]([^\s\^]+)$/gm, '$1');
                        return {target: _tag, version: _tag.replace(/^v/gm, '')}
                    });
                }
                deferred.resolve(tags);
            } catch (error) {
                bower.logger.debug('git ls-remote --tags', gitLsRemoteOutput);
                deferred.reject(error);
            }

        });

        gitLsRemote.stdout.on('error', function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
        // console.log(`Starting RELEASES method for -> ${source} ...`);
        // return mercurial.clone(source, this.directory)
        //     .catch( (e) => {
        //         console.log(`Custom error ${e}`);
        //     })
        //     .then((directory) => {
        //         console.log(`RELEASES method :: resolved promise for -> ${directory} ...`);
        //         this.directory = directory;
        //
        //         let branches = mercurial.branches(directory.name)
        //             .catch( (e) => {
        //                 console.log(`Custom error su BRANCHES ${e}`);
        //             })
        //
        //         let tags = mercurial.tags(directory.name)
        //             .catch( (e) => {
        //                 console.log(`Custom error su TAGS ${e}`);
        //             })
        //
        //         return Promise.all([branches, tags]);
        //     })
        //     .spread(parser.versions);
    }

    // It downloads package and extracts it to temporary directory
    // You can use npm's "tmp" package to tmp directories
    // See the "Resolver API" section for details on this method
    fetch (endpoint) {
        var deferred = Q.defer(),
            tmpDir = tmp.dirSync().name,
            target = endpoint.target == '*' ? 'tip' : endpoint.target,
            url = endpoint.source + '/archive/' + target + '.zip?auth_token=' + bower.config.rhodecode.token,
            filePath = tmpDir + '/' + endpoint.name;

        bower.logger.debug('rhodecode: repo url', url);

        request.get(url)
            .pipe(fs.createWriteStream(filePath))
            .on('close', function () {

                try {
                    var buffer = readChunk.sync(filePath, 0, 262),
                        fileType = FileType(buffer),
                        fileExt = (fileType ? fileType.ext : 'txt'),
                        newFilePath = filePath + '.' + fileExt;

                    fs.renameSync(filePath, newFilePath);

                    if (fileExt === 'zip') {

                        var zip = new AdmZip(newFilePath),
                            extractedDir;

                        zip.getEntries().forEach(function (zipEntry) {
                            zip.extractEntryTo(zipEntry.entryName, tmpDir, true, true);

                            if (typeof extractedDir == 'undefined') {
                                extractedDir = tmpDir + path.sep + zipEntry.entryName.replace(/(^[^\\\/]+).*/, '$1')
                            }

                        });

                        fs.unlink(newFilePath, function () {
                            deferred.resolve({
                                tempPath: extractedDir,
                                removeIgnores: true
                            });

                        });
                    } else {
                        deferred.reject("Invalid file, check on this link", url);
                    }
                } catch (err) {
                    deferred.reject(err);
                }
            })
            .on('error', function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
        // console.log(`Starting FETCH method....`);
        // return mercurial.clone(endpoint.source, this.directory)
        //     .catch( (e) => {
        //         console.log(`FETCH METHOD: Clone error  ${e}`);
        //     })
        //     .then((directory) => {
        //         this.directory = directory;
        //
        //         return mercurial.update(endpoint, this.directory.name);
        //     })
        //     .catch( (e) => {
        //         console.log(`FETCH METHOD: Update error  ${e}`);
        //     })
        //     .then(() => {
        //         return {
        //             tempPath: this.directory.name
        //         };
        //     });
    }

    error (type) {
        console.log(`Error --> ${type}`);
        return (e) => this.bower.logger.error(type, e.toString());
    }
}
