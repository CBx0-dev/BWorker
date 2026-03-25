import {parentPort as parent, workerData} from "worker_threads";

import type {Commands,FulfillCommand} from "./shared";
import { Serializable } from "child_process";

if (!parent) {
    throw "Cannot start worker: Parent handler is undefined";
}
if (!workerData.module || typeof workerData.module != "string") {
    throw "Cannot start worker: Missing module information";
}

const module: any = await import(workerData.module);

function fullfill(tid: number, value?: Serializable) {
    const message: FulfillCommand = {
        cmd: "fullfill",
        tid: tid
    }

    if (value) {
        message.value = value;
    }

    parent!.postMessage(message);
}

parent.on("message", async (cmd: Commands) => {
    if (cmd.cmd == "invoke") {
        const property = module[cmd.name];
        if (typeof property != "function") {
            throw `'${cmd.name}' is not a function`;
        }

        let result: Serializable | undefined | Promise<Serializable | undefined> = property(...cmd.args);
        if (result instanceof Promise) {
            result = await result;
        }

        fullfill(cmd.tid, result);        
    }
});

