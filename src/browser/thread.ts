import type {IWorker, Serializable} from "../index.js";
import type {Commands, InvokeCommand} from "../commands.js";

export class BrowserWorker implements IWorker {
    private readonly transactions: Map<number, (value?: Serializable) => void>;
    private readonly threadURL: URL;
    private worker!: Worker;

    public constructor(url: URL) {
        this.transactions = new Map<number, (value?: Serializable) => void>();
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
        return new Promise<Serializable | void>(resolve => {
            this.transactions.set(command.tid, resolve);
            this.worker.postMessage(command)
        });
    }

    private onMessage(ev: MessageEvent): void {
        const cmd: Commands = ev.data;
        if (cmd.cmd == "fulfill") {
            const resolve = this.transactions.get(cmd.tid);
            if (!resolve) {
                console.error(`Unknown transaction id ${cmd.tid}`);
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
        return typeof WorkerGlobalScope == "undefined" || !(self instanceof WorkerGlobalScope);
    }
}