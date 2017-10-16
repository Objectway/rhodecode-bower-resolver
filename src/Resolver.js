'use strict';

// Constants:
const SOURCE_MATCH_REGEX = /^git\+(ssh|https?):\/\//i

// Dependencies:
import mercurial from './mercurial';
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
        console.log(`Starting RELEASES method for -> ${source} ...`);
        return mercurial.clone(source, this.directory)
            .catch( (e) => {
                console.log(`Pacho error ${e}`);
            })
            .then((directory) => {
                console.log(`RELEASES method :: resolved promise for -> ${directory} ...`);
                this.directory = directory;

                let branches = mercurial.branches(directory.name)
                    .catch( (e) => {
                        console.log(`Pacho error su BRANCHES ${e}`);
                    })

                let tags = mercurial.tags(directory.name)
                    .catch( (e) => {
                        console.log(`Pacho error su TAGS ${e}`);
                    })

                return Promise.all([branches, tags]);
            })
            .spread(parser.versions);
    }

    fetch (endpoint) {
        console.log(`Starting FETCH method....`);
        return mercurial.clone(endpoint.source, this.directory)
            .catch( (e) => {
                console.log(`FETCH METHOD: Clone error  ${e}`);
            })
            .then((directory) => {
                this.directory = directory;

                return mercurial.update(endpoint, this.directory.name);
            })
            .catch( (e) => {
                console.log(`FETCH METHOD: Update error  ${e}`);
            })
            .then(() => {
                return {
                    tempPath: this.directory.name
                };
            });
    }

    error (type) {
        console.log(`Minchia --> ${type}`);
        return (e) => this.bower.logger.error(type, e.toString());
    }
}
