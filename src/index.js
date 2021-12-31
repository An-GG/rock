#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var util_1 = require("util");
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
    return __awaiter(this, void 0, void 0, function () {
        var is_root, p, result, result, _i, _a, c;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // check command is valid
                    //
                    //
                    if (!['enable', 'disable'].includes(args[1])) {
                        console.log('ERROR: invalid command argument');
                        console.log(USAGE);
                        return [2 /*return*/];
                    }
                    is_root = process.getuid() == 0;
                    if (!is_root) {
                        console.log('ERROR: must run as root user. try: \n');
                        console.log('sudo rock autostart ' + args[1]);
                        return [2 /*return*/];
                    }
                    p = get_async_pm2();
                    if (!(args[1] == 'enable')) return [3 /*break*/, 3];
                    return [4 /*yield*/, p.start(__filename, {
                            name: "rock",
                            watch: true,
                            cwd: rock_dir
                        })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, p.startup(undefined, {})];
                case 2:
                    result = _b.sent();
                    console.log("writing %s\nenabled on %s", result.destination, result.platform);
                    return [3 /*break*/, 6];
                case 3: return [4 /*yield*/, p.del(__filename)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, p.uninstallStartup(undefined, {})];
                case 5:
                    result = _b.sent();
                    for (_i = 0, _a = result.commands; _i < _a.length; _i++) {
                        c = _a[_i];
                        console.log("> " + c);
                    }
                    console.log("disabld on " + result.platform);
                    _b.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function get_async_pm2() {
    var startfn = function (script, opts, cb) { return pm2_1["default"].start(script, opts, cb); };
    var connectfn = function (noDaemonMode, cb) { return pm2_1["default"].connect(noDaemonMode, cb); };
    return {
        connect: util_1.promisify(connectfn),
        disconnect: pm2_1["default"].disconnect,
        start: util_1.promisify(startfn),
        startup: util_1.promisify(pm2_1["default"].startup),
        del: util_1.promisify(pm2_1["default"].delfn),
        uninstallStartup: util_1.promisify(pm2_1["default"].uninstallStartup)
    };
}
var USAGE = "rock <ngrok args> | autostart\n\n    Create a git repo at ~/.rock and make sure 'git push --force' and 'ngrok' works, then start 'rock <ngrok args>' or just 'rock' for default ssh configuration.\n\n    rock\n        Equivalent to 'rock tcp 22'.\n\n    rock <ngrok args>\n        Passes <ngrok args> to ngrok.\n\n    rock autostart <enable|disable>\n        Launch at startup automatically. Must run this command as root.";
if (args[0] == 'autostart') {
    autostart_command();
}
else {
    ngrok_command();
}
