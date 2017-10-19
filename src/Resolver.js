'use strict';

// Dependencies:
import mercurial from './mercurial';
// --- useless after rework
import spawnCommand from 'spawn-command';
import readChunk from 'read-chunk';
import FileType from 'file-type';
import AdmZip from 'adm-zip';
import tmp from 'tmp';
import request from 'request';
import fs from 'fs';
import path from 'path';
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

export default class Resolver {

    directory;
    registryClient;
    bower;
    packageURL;

    constructor (bowerLocal) {
        this.bower = bowerLocal;

        // Check bowerRC configuration file
        //console.log('bower config', bower.config);
        if (!bowerLocal.config.hasOwnProperty('rhodecode') || !bowerLocal.config.rhodecode.hasOwnProperty('repo') || !bowerLocal.config.rhodecode.hasOwnProperty('token')) {
            bowerLocal.logger.error('rhodecode-bower-resolver', `Invalid settings in your .bowerrc file, check you have this properties: \n\"rhodecode\": {\n\t\"repo\": \"www.myrepo.com\",\n\t\"token\": \"asdfghjkl1234567890\"\n}`);
            process.exit();
        }
        this.registryClient = new RegistryClient(bowerLocal.config, console);
    }

    // Match method tells whether resolver supports given source
    // It can return either boolean or promise of boolean
    match (source) {
        //console.log(`> Starting match method for -> ${source}...`);
        this.packageURL = source;

        if (source && source.indexOf(this.bower.config.rhodecode.repo) != -1) {
            //console.log(`> Match method :: Discovered -> ${source}...`);
            return true;
        }
        //console.log(`> Match method :: Creating promise for -> ${source} ...`);

        return Q.nfcall(this.registryClient.lookup.bind(this.registryClient), source).then( (entry) => {
            //console.log(`> Match method :: Promise Resolved for -> ${source} :: ... ${JSON.stringify(entry)}`);
            // If entry starts with hermes then use this resolver to get the bower package otherwise return false
            // and use standard bower resolution.
            if ( entry && entry.url && entry.url.startsWith(this.bower.config.rhodecode.repo) ) {
                this.packageURL = entry.url;
                return true
            }
            return false;
        });

    }

    // Optional:
    // Can resolve or normalize sources, like:
    // "jquery" => "git://github.com/jquery/jquery.git"
    locate (source) {
        return this.packageURL;
    }

    // Optional:
    // Allows to list available versions of given source.
    // Bower chooses matching release and passes it to "fetch"
    releases (source) {

        this.directory = tmp.dirSync();

        //console.log(`Starting RELEASES method for SOURCE -> ${source} ...`);
        //console.log(`Starting RELEASES method for DIRECTORY -> ${this.directory.name} ...`);
        return mercurial.clone(source, this.directory)
            .catch( (e) => {
                console.log(`Custom error ${e}`);
            })
            .then((directoryLocal) => {
                //console.log(`RELEASES method :: resolved promise for DIR FROM PROMISE -> ${directoryLocal.name} ...`);
                console.log(`RELEASES method :: resolved promise for DIR ON CLASS -> ${this.directory.name} ...`);
                //this.directory = directoryLocal;

                let branches = mercurial.branches(this.directory.name).catch( (e) => {
                    console.log(`Custom error su BRANCHES ${e}`);
                });

                let tags = mercurial.tags(this.directory.name).catch( (e) => {
                    console.log(`Custom error su TAGS ${e}`);
                });

                return Promise.all([branches, tags]);
            })
            .spread(parser.versions);
    }

    // It downloads package and extracts it to temporary directory
    // You can use npm's "tmp" package to tmp directories
    // See the "Resolver API" section for details on this method
    fetch (endpoint) {
        //console.log(`Starting FETCH method for endpoint ${endpoint.source}`);
        return mercurial.clone(endpoint.source, this.directory)
            .catch( (e) => {
                console.log(`FETCH METHOD: Clone error  ${e}`);
            })
            .then((directory) => {
                //this.directory = directory;

                return mercurial.update(endpoint, this.directory.name);
            })
            .catch( (e) => {
                console.log(`FETCH METHOD: Update error  ${e}`);
            })
            .then(() => {
                console.log(`FETCH METHOD: last promise resolution`);
                // Return the temp path in order to allow bower to resolve the installation
                return {
                    tempPath: this.directory.name
                };
            });
    }

    error (type) {
        console.log(`Error --> ${type}`);
        return (e) => this.bower.logger.error(type, e.toString());
    }

}
