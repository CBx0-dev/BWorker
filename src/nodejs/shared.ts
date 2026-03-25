import type {Serilizable} from "..";

export interface InvokeCommand {
    tid: number;
    cmd: "invoke";
    name: string;
    args: Serilizable[];
}

export interface FulfillCommand {
    tid: number;
    cmd: "fullfill";
    value?: Serilizable;
}

export type Commands = InvokeCommand | FulfillCommand;