#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const rock_dir = '~/.rock'.replace('~', process.env.HOME ? process.env.HOME : '~');
const log_file = 'log.txt';
const endpoint_file = 'endpoint.txt';
const args = (process.argv.length == 2) ? ['tcp', '22'] : process.argv.slice(2);
const ngrok_path = '/usr/local/bin/ngrok';
const ngrok_args = [...args, '--log', 'stdout', '--log-format', 'json'];
usage_on_err(() => { process.chdir(rock_dir); }, true);
let message_queue = [];
let last_msg = '';
let ngrok_process = child_process_1.spawn(ngrok_path, ngrok_args, { cwd: rock_dir });
ngrok_process.stdout.on('data', (d) => {
    promises_1.appendFile(log_file, d);
    // Two possible cases: 
    // 1. the last has not finished sending and does not end in '\n'
    //      -> last msg in msgs array cannot be parsed
    // 2. the data ends with '\n'
    //      -> last msg in msgs array cannot be parsed
    // last message must be stored and combined with next data
    let combined = last_msg + d.toString();
    let msgs = combined.split('\n');
    last_msg = msgs.pop();
    message_queue.push(...msgs);
    while (message_queue.length > 0) {
        data_from_ngrok(message_queue.shift());
    }
});
function data_from_ngrok(str) {
    let message = {};
    try {
        message = JSON.parse(str);
    }
    catch (json_err) {
        console.log("ERROR: ngrok output could not be parsed as JSON:");
        console.log(str);
        return;
    }
    if (message["msg"] == "started tunnel") {
        console.log(message["url"]);
        fs_1.writeFileSync(endpoint_file, message["url"]);
        cmd('git add --all');
        cmd('git commit -m "auto rock"');
        cmd('git push --force');
    }
}
function usage_on_err(fn, exit, cmd) {
    try {
        fn();
    }
    catch (e) {
        if (cmd) {
            console.log("ERROR: '" + cmd + "' failed.\n");
        }
        console.log(`Usage: Create a git repo at ~/.rock and make sure 'git push --force' and 'ngrok' works, 
then start 'rock <ngrok args>' or just 'rock' for default ssh configuration.`);
        if (exit) {
            process.exit();
        }
    }
}
function cmd(s) {
    usage_on_err(() => { child_process_1.execSync(s); }, false, s);
}
