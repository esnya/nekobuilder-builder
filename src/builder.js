'use strict';

const fs = require('fs-promise');
const yaml = require('js-yaml');
const spawn = require('./spawn');

const build = (buildData) => {
    const build = buildData.build;
    const repository = buildData.repository;

    console.log(build);
    console.log(repository);

    const ref = build.ref;
    const id = build.commit_id;

    const clone_url = repository.clone_url;
    const full_name = repository.full_name;

    const image_name = full_name.toLowerCase();
    const tag = ref.split('/')[2];

    const ref_type = ref.split('/')[1];
    const latest = ref_type === 'heads' && (
        tag === 'master' ? 'latest' : `${tag}-latest`
    );

    const travis = 'build/.travis.yml';

    console.log('Build started');

    return spawn('git', ['init', 'build'])
        .then(() => spawn('git', ['fetch', clone_url, tag], 'build'))
        .then(() => spawn('git', ['checkout', '--force', id], 'build'))
        .then(() => spawn('git', ['submodule', 'update', '--init', '--recursive'], 'build'))
        .then(() => fs.exists(travis))
        .then((exists) => {
            if (!exists) return null;
            console.log('Loading .travis.yml');
            return fs.readFile(travis);
        })
        .then((data) => data && yaml.safeLoad(data))
        .then((conf) => conf && conf.env || [])
        .then((env) => env.reduce((res, e) => {
            const m = `${e}`.match(/^(.*?)=(.*)$/);
            if (m) {
                res[m[1]] = m[2];
            }
            return res;
        }, {}))
        .then((env) => spawn('docker', ['build', '-t', `${image_name}:${tag}`, '.'], 'build', {
            env: env,
        }))
        .then(() => latest &&
            spawn('docker', ['tag', '-f', `${image_name}:${tag}`, `${image_name}:${latest}`])
        );
};
module.exports.build = build;
