import { Serilizable, type IWorker } from "..";

export class BrowserWorker implements IWorker {
    private readonly threadURL: URL;
    private worker!: Worker;
    
    public constructor(url: URL) {
        this.threadURL = url;
    }

    public async init(): Promise<void> {
        this.worker = new Worker(new URL("./browser", import.meta.url), {
            type: "module"
        });

        // TODO pass thread url
    }
    
    public invoke(name: string, args: Serilizable[]) {
        
    }

    public async kill(): Promise<void> {
        await this.worker.terminate();
    }

    public static isMaster(): boolean {
        return typeof WorkerGlobalScope != "undefined" && self instanceof WorkerGlobalScope;
    }
}