import {parentPort as parent, workerData} from "worker_threads";

import type {Serializable} from "../index.js";
import type {Commands, FulfillCommand, InitCommand, InvokeCommand} from "../commands.js";

if (!parent) {
    throw "Cannot start worker: Parent handler is undefined";
}
if (!workerData.module || typeof workerData.module != "string") {
    throw "Cannot start worker: Missing module information";
}

const module: any = await import(workerData.module);

async function init(_cmd: InitCommand): Promise<void> {
    return;
}

async function invoke(cmd: InvokeCommand): Promise<void> {
    const property = module[cmd.name];
    if (typeof property != "function") {
        throw `'${cmd.name}' is not a function`;
    }

    let result: Serializable | undefined | Promise<Serializable | undefined> = property(...cmd.args);
    if (result instanceof Promise) {
        result = await result;
    }

    fulfill(cmd.tid, result);
}

function fulfill(tid: number, value?: Serializable): void {
    const message: FulfillCommand = {
        cmd: "fulfill",
        tid: tid
    }

    if (value) {
        message.value = value;
    }

    parent!.postMessage(message);
}

parent.on("message", async (cmd: Commands) => {
    if (cmd.cmd == "init") {
        await init(cmd);
        return;
    }

    if (cmd.cmd == "invoke") {
        await invoke(cmd);
        return;
    }

    throw `Unknown command '${cmd.cmd}'`;
});

