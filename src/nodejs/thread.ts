import type {Worker} from "worker_threads";

import type {IWorker, Serializable} from "../index.js";
import type {Commands, InvokeCommand} from "../commands.js";

type TransactionTuple = [resolve: (value?: Serializable) => void, reject: (value: string) => void];

export class NodeJSWorker implements IWorker {
    private readonly transactions: Map<number, TransactionTuple>;
    private readonly threadURL: URL;
    private worker!: Worker;

    public constructor(url: URL) {
        this.transactions = new Map<number, TransactionTuple>();
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
        return new Promise<Serializable>((resolve, reject) => {
            const tid: number = this.getNextTransactionId();
            this.transactions.set(tid, [resolve, reject]);
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
            const transactionTuple: TransactionTuple | undefined = this.transactions.get(cmd.tid);
            if (!transactionTuple) {
                return;
            }

            const [resolve] = transactionTuple;
            this.transactions.delete(cmd.tid);
            resolve(cmd.value);
        } else if (cmd.cmd == "reject") {
            const transactionTuple: TransactionTuple | undefined = this.transactions.get(cmd.tid);
            if (!transactionTuple) {
                return;
            }

            const [, reject] = transactionTuple;
            this.transactions.delete(cmd.tid);
            reject(cmd.value);
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