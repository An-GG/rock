#!/usr/bin/env node
"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var pm2_1 = __importDefault(require("pm2"));
var rock_dir = '~/.rock'.replace('~', process.env.HOME ? process.env.HOME : '~');
var log_file = 'log.txt';
var endpoint_file = 'endpoint.txt';
var args = (process.argv.length == 2) ? ['tcp', '22'] : process.argv.slice(2);
var ngrok_path = '/usr/local/bin/ngrok';
var ngrok_args = __spreadArray(__spreadArray([], args), ['--log', 'stdout', '--log-format', 'json']);
usage_on_err(function () { process.chdir(rock_dir); }, true);
var message_queue = [];
var last_msg = '';
function ngrok_command() {
    var ngrok_process = child_process_1.spawn(ngrok_path, ngrok_args, { cwd: rock_dir });
    ngrok_process.stdout.on('data', function (d) {
        promises_1.appendFile(log_file, d);
        // Two possible cases: 
        // 1. the last has not finished sending and does not end in '\n'
        //      -> last msg in msgs array cannot be parsed
        // 2. the data ends with '\n'
        //      -> last msg in msgs array cannot be parsed
        // last message must be stored and combined with next data
        var combined = last_msg + d.toString();
        var msgs = combined.split('\n');
        last_msg = msgs.pop();
        message_queue.push.apply(message_queue, msgs);
        while (message_queue.length > 0) {
            data_from_ngrok(message_queue.shift());
        }
    });
}
function data_from_ngrok(str) {
    var message = {};
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
        console.log(USAGE);
        if (exit) {
            process.exit();
        }
    }
}
function cmd(s) {
    usage_on_err(function () { child_process_1.execSync(s); }, false, s);
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
    var is_root = process.getuid() == 0;
    if (!is_root) {
        console.log('ERROR: must run as root user. try: \n');
        console.log('sudo rock autostart ' + args[1]);
        return;
    }
    if (args[1] == 'enable') {
        pm2_1["default"].start(__filename, {
            name: "rock",
            watch: true,
            cwd: rock_dir
        }, function (e1, proc) {
            if (e1) {
                console.log("\nERROR: failed to enable autostart.\n");
                console.log(e1);
                process.exit();
            }
            else {
                pm2_1["default"].startup(undefined, {}, function (e2, result) {
                    if (e2) {
                        console.log('\nERROR: failed to enable autostart.\n');
                        console.log(e2);
                    }
                    else {
                        console.log("Enabled");
                    }
                    process.exit();
                });
            }
        });
    }
    else {
        pm2_1["default"]["delete"](__filename, function (e1, proc) {
            if (e1) {
                console.log("\nERROR: failed to disable autostart.\n");
                console.log(e1);
            }
            else {
                pm2_1["default"].uninstallStartup(undefined, {}, function (e2, result) {
                    if (e2) {
                        console.log('\nERROR: failed to disable autostart.\n');
                        console.log(e2);
                    }
                    else {
                        console.log("Disabled");
                    }
                    process.exit();
                });
            }
        });
    }
}
var USAGE = "rock <ngrok args> | autostart\n\n    Create a git repo at ~/.rock and make sure 'git push --force' and 'ngrok' works, then start 'rock <ngrok args>' or just 'rock' for default ssh configuration.\n\n    rock\n        Equivalent to 'rock tcp 22'.\n\n    rock <ngrok args>\n        Passes <ngrok args> to ngrok.\n\n    rock autostart <enable|disable>\n        Launch at startup automatically. Must run this command as root.";
if (args[0] == 'autostart') {
    autostart_command();
}
else {
    ngrok_command();
}
