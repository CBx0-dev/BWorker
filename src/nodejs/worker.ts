import {parentPort as parent, workerData} from "worker_threads";

import type {Serializable} from "../index.js";
import type {Commands, FulfillCommand, InitCommand, InvokeCommand, RejectCommand} from "../commands.js";

if (!parent) {
    throw "Cannot start worker: Parent handler is undefined";
}
if (!workerData.module || typeof workerData.module != "string") {
    throw "Cannot start worker: Missing module information";
}

let module: any | null = null;

async function init(cmd: InitCommand): Promise<void> {
    module = await import(cmd.module);
    fulfill(cmd.tid);
}

async function invoke(cmd: InvokeCommand): Promise<void> {
    if (!module) {
        throw "Module is not initialized. You have to first invoke a init command";
    }

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

function reject(tid: number, err: string): void {
    parent!.postMessage({
        cmd: "reject",
        tid: tid,
        value: err
    } satisfies RejectCommand);
}

parent.on("message", async (cmd: Commands) => {
    if (cmd.cmd == "init") {
        await init(cmd);
        return;
    }

    if (cmd.cmd == "invoke") {
        try {
            await invoke(cmd);
        } catch (e) {
            reject(cmd.tid, String(e));
        }
        return;
    }

    throw `Unknown command '${cmd.cmd}'`;
});

