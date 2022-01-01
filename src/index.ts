#!/usr/bin/env node
import { exec, execSync, spawn } from "child_process";
import { appendFileSync, writeFileSync } from "fs";
import { appendFile } from "fs/promises";
import { promisify } from "util";
import simpleGit, {SimpleGit} from 'simple-git';
import pm2 from 'pm2';

const is_root = process.getuid() == 0;
const user_home = is_root ? execSync("sudo -u "+process.env.SUDO_USER+' echo $HOME').toString().split('\n')[0] : process.env.HOME!;

const ngrok_cfg = '~/.ngrok2/ngrok.yml'.replace('~', user_home);
const rock_dir = '~/.rock'.replace('~', user_home);

const git = simpleGit({
    baseDir: rock_dir,
    spawnOptions: {
        gid: 20,
        uid: 501
    }
});

const log_file = 'log.txt';
const endpoint_file = 'endpoint.txt'

const args = (process.argv.length == 2) ? ['tcp', '22'] : process.argv.slice(2);
const ngrok_path = '/usr/local/bin/ngrok';
const ngrok_args = [...args, '--config', ngrok_cfg, '--log','stdout','--log-format','json'];

console.log(new Date());

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
async function data_from_ngrok(str: string) {
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
        let rres = await git.push();
        console.log(rres);
        //cmd(`sudo --login --user=ankushgirotra sh -c 'cd ~/.rock && git push --force'`);
    }
}

function usage_on_err(fn:()=>any, exit?:boolean, cmd?: string) {
    try { fn(); } catch(e) {
        if (cmd) { console.log("ERROR: '" + cmd + "' failed.\n");}
        console.log(USAGE);
        console.log(e);
        if (exit) { process.exit(); }
    }
}

function cmd(s:string) {
    usage_on_err(()=>{execSync(s);}, false, s);
}
async function autostart_command() {
   
    if (!['enable', 'disable'].includes(args[1])) {
        console.log('ERROR: invalid command argument');
        console.log(USAGE);
        return;
    }
    if (!is_root) { 
        console.log('ERROR: must run as root user. try: \n'); 
        console.log('sudo rock autostart '+args[1]);
        return;
    }
    if (!process.env.SUDO_USER) {
        console.log('ERROR: the SUDO_USER environment variable must be defined.');
        return;
    }

    let p = get_async_pm2();
    let cr = await p.connect(false);
    
    if (args[1] == 'enable') {
        await p.start(__filename, {
            name: "rock",
            watch: false,
            cwd: rock_dir,
        });
        let result = await p.startup(undefined, {}) as { destination:string, template:string, platform: string };
        console.log("writing %s\n\nenabled on %s", result.destination, result.platform);
    } else {
        let rocks = (await p.list()).filter(r => r.name == 'rock');
        for (let r of rocks) {
            await p.del(r.pm_id as any);
        }
        let result = await p.uninstallStartup(undefined, {}) as { commands:string[], platform:string };
        for (let c of result.commands) {
            console.log("> "+c);
        }
        console.log("\ndisabled on "+result.platform);
    }
    process.exit();
}


function get_async_pm2() {
    const startfn = (script:string, opts:pm2.StartOptions, cb:(er:any,result:any)=>void) => pm2.start(script, opts, cb);
    const connectfn = (noDaemonMode: boolean, cb:(er:any)=>void) => pm2.connect(noDaemonMode, cb);
    const delfn = (name:string, cb:(er:any)=>void) => pm2.delete(name, cb);
    const listfn = (cb:(er:any, procs: Parameters<Parameters<typeof pm2.list>[0]>[1])=>void) => pm2.list(cb);
    return {
        connect: promisify(connectfn),
        start: promisify(startfn),
        startup: promisify(pm2.startup),
        del: promisify(delfn),
        uninstallStartup: promisify(pm2.uninstallStartup),
        list: promisify(listfn)
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
