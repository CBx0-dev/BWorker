import type {Serializable} from "../index.js";
import type {Commands, FulfillCommand, InitCommand, InvokeCommand} from "../commands.js";

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
        throw `${cmd.name} is not function`;
    }

    let result: Serializable | undefined | Promise<Serializable | undefined> = property(...cmd.args);
    if (result instanceof Promise) {
        result = await result;
    }

    fulfill(cmd.tid, result as Serializable);
}

function fulfill(tid: number, value?: Serializable): void {
    const message: FulfillCommand = {
        cmd: "fulfill",
        tid: tid
    }

    if (value) {
        message.value = value;
    }

    self.postMessage(message);
}

self.onmessage = async function (ev: MessageEvent) {
    const cmd: Commands = ev.data;
    if (cmd.cmd == "init") {
        await init(cmd);
        return;
    }

    if (cmd.cmd == "invoke") {
        await invoke(cmd);
        return;
    }

    throw `Unknown command '${cmd.cmd}'`;
}