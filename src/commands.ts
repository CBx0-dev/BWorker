import type {Serializable} from ".";

export interface InvokeCommand {
    tid: number;
    cmd: "invoke";
    name: string;
    args: Serializable[];
}

export interface FulfillCommand {
    tid: number;
    cmd: "fulfill";
    value?: Serializable;
}

export interface InitCommand {
    tid: number;
    cmd: "init";
    module: string;
}

export type Commands = InvokeCommand | FulfillCommand | InitCommand;