import {Worker, isMainThread} from "worker_threads";

import type {Serilizable, IWorker} from "..";
import type {InvokeCommand, Commands} from "./shared";

export class NodeJSWorker implements IWorker {
    private readonly transactions: Map<number, (value?: Serilizable) => void>;
    private readonly threadURL: URL;
    private worker!: Worker;
    
    public constructor(url: URL) {
        this.transactions = new Map<number, (value?: Serilizable) => void>();
        this.threadURL = url;
    }

    public async init(): Promise<void> {
        const {Worker} = await import("worker_threads");

        this.worker = new Worker(new URL("./worker.js", import.meta.url), {
            workerData: {
                module: this.threadURL.toString()
            },
            stdout: true
        });

        this.worker.on("message", this.onCommand.bind(this));
        this.worker.stdout.on("data", (chunk) => process.stdout.write(chunk));
    }

    public async invoke(name: string, args: Serilizable[]): Serilizable {    
        return new Promise<Serilizable>(resolve => {
            const tid: number = this.getNextTransactionId();
            this.transactions.set(tid, resolve);
            this.worker.postMessage({
                cmd: "invoke",
                tid,
                name,
                args
            } satisfies InvokeCommand);
        });
    }

    public async kill(): Promise<void> {
        await this.worker.terminate();
    }

    private onCommand(cmd: Commands): void {
        if (cmd.cmd == "fullfill") {
            const resolve = this.transactions.get(cmd.tid);
            if (!resolve) {
                return;
            }
            
            this.transactions.delete(cmd.tid);
            resolve(cmd.value);
        }
    }

    private getNextTransactionId(): number {
        let i: number = this.transactions.size;
        while (this.transactions.has(i)) {
            i++;
        }

        return i;
    }

    public static isMaster(): boolean {
        return isMainThread;
    }
}