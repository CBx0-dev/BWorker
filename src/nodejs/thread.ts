import type {Worker} from "worker_threads";

import type {Serializable, IWorker} from "../index.js";
import type {InvokeCommand, Commands} from "../commands.js";

export class NodeJSWorker implements IWorker {
    private readonly transactions: Map<number, (value?: Serializable) => void>;
    private readonly threadURL: URL;
    private worker!: Worker;
    
    public constructor(url: URL) {
        this.transactions = new Map<number, (value?: Serializable) => void>();
        this.threadURL = url;
    }

    public async init(): Promise<void> {
        const {Worker} = await import("worker_threads");

        this.worker = new Worker(new URL("./worker.js?url", import.meta.url), {
            workerData: {
                module: this.threadURL.toString()
            },
            stdout: true
        });

        this.worker.on("message", this.onCommand.bind(this));
    }

    public invoke(name: string, args: Serializable[]): Promise<Serializable> {
        return new Promise<Serializable>(resolve => {
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
        if (cmd.cmd == "fulfill") {
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

    public static async isMaster(): Promise<boolean> {
        const {isMainThread} = await import("worker_threads");
        return isMainThread;
    }
}