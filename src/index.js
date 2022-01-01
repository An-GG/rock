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
var simple_git_1 = __importDefault(require("simple-git"));
var pm2_1 = __importDefault(require("pm2"));
var is_root = process.getuid() == 0;
var user_home = is_root ? child_process_1.execSync("sudo -u " + process.env.SUDO_USER + ' echo $HOME').toString().split('\n')[0] : process.env.HOME;
var ngrok_cfg = '~/.ngrok2/ngrok.yml'.replace('~', user_home);
var rock_dir = '~/.rock'.replace('~', user_home);
var git = simple_git_1["default"]({
    baseDir: rock_dir
});
var log_file = 'log.txt';
var endpoint_file = 'endpoint.txt';
var args = (process.argv.length == 2) ? ['tcp', '22'] : process.argv.slice(2);
var ngrok_path = '/usr/local/bin/ngrok';
var ngrok_args = __spreadArray(__spreadArray([], args), ['--config', ngrok_cfg, '--log', 'stdout', '--log-format', 'json']);
console.log(new Date());
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
    return __awaiter(this, void 0, void 0, function () {
        var message, err_1, push_result, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    message = {};
                    try {
                        message = JSON.parse(str);
                    }
                    catch (json_err) {
                        console.log("ERROR: ngrok output could not be parsed as JSON:");
                        console.log(str);
                        return [2 /*return*/];
                    }
                    if (!(message["msg"] == "started tunnel")) return [3 /*break*/, 8];
                    console.log(message["url"]);
                    fs_1.writeFileSync(endpoint_file, message["url"]);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, git.add(['--all'])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, git.commit("autorock")];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.log(err_1);
                    console.log("\n\nERROR: failed to commit changes.\n" + USAGE);
                    return [2 /*return*/];
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, git.push(['--force'])];
                case 6:
                    push_result = _a.sent();
                    console.log("Push Complete --------> " + push_result.repo + " @ " + push_result.update.hash.to);
                    return [3 /*break*/, 8];
                case 7:
                    err_2 = _a.sent();
                    console.log(err_2);
                    console.log("\n\nERROR: committed changes, but failed to push.\n" +
                        "Make sure the root user has access to git credentials and can run 'git push' in " +
                        rock_dir + ".\n\n" +
                        "Note: On macos, the default credential helper (osxkeychain) will NOT work.\n\n");
                    return [2 /*return*/];
                case 8: return [2 /*return*/];
            }
        });
    });
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
        console.log(e);
        if (exit) {
            process.exit();
        }
    }
}
function autostart_command() {
    return __awaiter(this, void 0, void 0, function () {
        var p, cr, result, rocks, _i, rocks_1, r, result, _a, _b, c;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!['enable', 'disable'].includes(args[1])) {
                        console.log('ERROR: invalid command argument');
                        console.log(USAGE);
                        return [2 /*return*/];
                    }
                    if (!is_root) {
                        console.log('ERROR: must run as root user. try: \n');
                        console.log('sudo rock autostart ' + args[1]);
                        return [2 /*return*/];
                    }
                    if (!process.env.SUDO_USER) {
                        console.log('ERROR: the SUDO_USER environment variable must be defined.');
                        return [2 /*return*/];
                    }
                    p = get_async_pm2();
                    return [4 /*yield*/, p.connect(false)];
                case 1:
                    cr = _c.sent();
                    if (!(args[1] == 'enable')) return [3 /*break*/, 4];
                    return [4 /*yield*/, p.start(__filename, {
                            name: "rock",
                            watch: false,
                            cwd: rock_dir
                        })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, p.startup(undefined, {})];
                case 3:
                    result = _c.sent();
                    console.log("writing %s\n\nenabled on %s", result.destination, result.platform);
                    return [3 /*break*/, 11];
                case 4: return [4 /*yield*/, p.list()];
                case 5:
                    rocks = (_c.sent()).filter(function (r) { return r.name == 'rock'; });
                    _i = 0, rocks_1 = rocks;
                    _c.label = 6;
                case 6:
                    if (!(_i < rocks_1.length)) return [3 /*break*/, 9];
                    r = rocks_1[_i];
                    return [4 /*yield*/, p.del(r.pm_id)];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9: return [4 /*yield*/, p.uninstallStartup(undefined, {})];
                case 10:
                    result = _c.sent();
                    for (_a = 0, _b = result.commands; _a < _b.length; _a++) {
                        c = _b[_a];
                        console.log("> " + c);
                    }
                    console.log("\ndisabled on " + result.platform);
                    _c.label = 11;
                case 11:
                    process.exit();
                    return [2 /*return*/];
            }
        });
    });
}
function get_async_pm2() {
    var startfn = function (script, opts, cb) { return pm2_1["default"].start(script, opts, cb); };
    var connectfn = function (noDaemonMode, cb) { return pm2_1["default"].connect(noDaemonMode, cb); };
    var delfn = function (name, cb) { return pm2_1["default"]["delete"](name, cb); };
    var listfn = function (cb) { return pm2_1["default"].list(cb); };
    return {
        connect: util_1.promisify(connectfn),
        start: util_1.promisify(startfn),
        startup: util_1.promisify(pm2_1["default"].startup),
        del: util_1.promisify(delfn),
        uninstallStartup: util_1.promisify(pm2_1["default"].uninstallStartup),
        list: util_1.promisify(listfn)
    };
}
var USAGE = "rock <ngrok args> | autostart\n\n    Create a git repo at ~/.rock and make sure 'git push --force' and 'ngrok' works, then start 'rock <ngrok args>' or just 'rock' for default ssh configuration.\n\n    rock\n        Equivalent to 'rock tcp 22'.\n\n    rock <ngrok args>\n        Passes <ngrok args> to ngrok.\n\n    rock autostart <enable|disable>\n        Launch at startup automatically. Must run this command as root.";
if (args[0] == 'autostart') {
    autostart_command();
}
else {
    ngrok_command();
}
