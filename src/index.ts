#!/usr/bin/env node

import { exec, execSync, spawn } from "child_process";
import { appendFileSync, writeFileSync } from "fs";
import { appendFile } from "fs/promises";
import { promisify } from "util";
import pm2 from 'pm2';

const rock_dir = '~/.rock'.replace('~', process.env.HOME ? process.env.HOME : '~');
const log_file = 'log.txt';
const endpoint_file = 'endpoint.txt'
const args = (process.argv.length == 2) ? ['tcp', '22'] : process.argv.slice(2);
const ngrok_path = '/usr/local/bin/ngrok';
const ngrok_args = [...args, '--log','stdout','--log-format','json'];

usage_on_err(()=>{process.chdir(rock_dir)}, true);

let message_queue: string[] = [];
let last_msg = '';

function ngrok_command() {
    let ngrok_process = spawn(ngrok_path, ngrok_args, { cwd: rock_dir });
    ngrok_process.stdout.on('data', (d) => {

        appendFile(log_file, d);
        
        // Two possible cases: 
        // 1. the last has not finished sending and does not end in '\n'
        //      -> last msg in msgs array cannot be parsed
        // 2. the data ends with '\n'
        //      -> last msg in msgs array cannot be parsed

        // last message must be stored and combined with next data

        let combined = last_msg + d.toString();
        let msgs = combined.split('\n');
        last_msg = msgs.pop()!;
        message_queue.push(...msgs);

        while (message_queue.length > 0) {
            data_from_ngrok(message_queue.shift()!);
        }
    });
}
function data_from_ngrok(str: string) {
    let message = {} as any;
    try { message = JSON.parse(str); } catch(json_err) {
        console.log("ERROR: ngrok output could not be parsed as JSON:");
        console.log(str);
        return;
    }
    if (message["msg"] == "started tunnel") {
        console.log(message["url"]);
        writeFileSync(endpoint_file, message["url"]);
        cmd('git add --all');
        cmd('git commit -m "auto rock"');
        cmd('git push --force');
    }
}

function usage_on_err(fn:()=>any, exit?:boolean, cmd?: string) {
    try { fn(); } catch(e) {
        if (cmd) { console.log("ERROR: '" + cmd + "' failed.\n");}
        console.log(USAGE);
        if (exit) { process.exit(); }
    }
}

function cmd(s:string) {
    usage_on_err(()=>{execSync(s);}, false, s);
}

function autostart_command() {
    // check command is valid
    //
    //
    
    if (!['enable', 'disable'].includes(args[1])) {
        console.log('ERROR: invalid command argument');
        console.log(USAGE);
        return;
    }

    let is_root = process.getuid() == 0;
    if (!is_root) { 
        console.log('ERROR: must run as root user. try: \n'); 
        console.log('sudo rock autostart '+args[1]);
        return;
    }

    if (args[1] == 'enable') {
        pm2.start(__filename, {
            name: "rock",
            watch: true,
            cwd: rock_dir,
        }, (e1, proc)=>{
            if (e1) {
                console.log("\nERROR: failed to enable autostart.\n");
                console.log(e1);
                process.exit();
            } else {

                pm2.startup(undefined, {} ,(e2, result) => {
                    if (e2) {
                        console.log('\nERROR: failed to enable autostart.\n');
                        console.log(e2);
                    } else {
                        console.log("Enabled");
                    }
                    process.exit();
                });

            }
        });
    } else {
        pm2.delete(__filename, (e1, proc)=>{
            if (e1) {
                console.log("\nERROR: failed to disable autostart.\n");
                console.log(e1);
            } else {
                pm2.uninstallStartup(undefined, {}, (e2, result) => {
                    if (e2) {
                        console.log('\nERROR: failed to disable autostart.\n');
                        console.log(e2);
                    } else {
                        console.log("Disabled");
                    }
                    process.exit();
                });
            }
        });
    }
    
}

const USAGE = 
`rock <ngrok args> | autostart

    Create a git repo at ~/.rock and make sure 'git push --force' and 'ngrok' works, then start 'rock <ngrok args>' or just 'rock' for default ssh configuration.

    rock
        Equivalent to 'rock tcp 22'.

    rock <ngrok args>
        Passes <ngrok args> to ngrok.

    rock autostart <enable|disable>
        Launch at startup automatically. Must run this command as root.`;




if (args[0] == 'autostart') { 
    autostart_command();
} else {
    ngrok_command();
}
