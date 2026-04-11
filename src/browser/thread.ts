import type {IWorker, Serializable} from "../index.js";
import type {Commands, InvokeCommand} from "../commands.js";

type TransactionTuple = [resolve: (value?: Serializable) => void, reject: (value: string) => void];

export class BrowserWorker implements IWorker {
    private readonly transactions: Map<number, TransactionTuple>;
    private readonly threadURL: URL;
    private worker!: Worker;

    public constructor(url: URL) {
        this.transactions = new Map<number, TransactionTuple>();
        this.threadURL = url;
    }

    public async init(): Promise<void> {
        this.worker = new Worker(new URL("./worker.js?url", import.meta.url), {
            type: "module"
        });

        this.worker.onmessage = this.onMessage.bind(this);
        await this.invokeCommand({
            tid: this.getNextTransactionId(),
            cmd: "init",
            module: this.threadURL.toString()
        });
    }

    public invoke(name: string, args: Serializable[]): Promise<Serializable | void> {
        const tid: number = this.getNextTransactionId();
        return this.invokeCommand({
            cmd: "invoke",
            tid,
            name,
            args
        } satisfies InvokeCommand);
    }

    public async kill(): Promise<void> {
        this.worker.terminate();
    }

    private invokeCommand(command: Commands): Promise<Serializable | void> {
        return new Promise<Serializable | void>((resolve, reject) => {
            this.transactions.set(command.tid, [resolve, reject]);
            this.worker.postMessage(command);
        });
    }

    private onMessage(ev: MessageEvent): void {
        const cmd: Commands = ev.data;
        if (cmd.cmd == "fulfill") {
            const transactionTuple: TransactionTuple | undefined = this.transactions.get(cmd.tid);
            if (!transactionTuple) {
                console.error(`Unknown transaction id ${cmd.tid}`);
                return;
            }

            const [resolve] = transactionTuple;
            this.transactions.delete(cmd.tid);
            resolve(cmd.value);
        } else if (cmd.cmd == "reject") {
            const transactionTuple: TransactionTuple | undefined = this.transactions.get(cmd.tid);
            if (!transactionTuple) {
                console.error(`Unknown transaction id ${cmd.tid}`);
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
        return typeof WorkerGlobalScope == "undefined" || !(self instanceof WorkerGlobalScope);
    }
}