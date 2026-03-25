export interface IWorker {
    init(): Promise<void>;

    invoke(name: string, args: Serializable[]): Serializable;

    kill(): Promise<void>;
}

// @ts-ignore
export type Serializable = string | number | boolean | Record<string | number, Serializable> | Array<Serializable>;

export type ThreadFunction = (...args: Serializable[]) => Promise<Serializable>;

export interface ThreadModule {
    [name: string]: ThreadFunction;
}

export interface IWorkerStatic {
    isMaster(): Promise<boolean>;
}

export type IWorkerCtor = (new (url: URL) => IWorker) & IWorkerStatic;

export class Thread {
    private readonly worker: IWorker;

    private constructor(worker: IWorker) {
        this.worker = worker;

        return new Proxy(this, {
            get: (target, prop, receiver) => {
                const value = Reflect.get(target, prop, receiver);
                if (typeof value == "undefined" && !(prop in target)) {
                    if (typeof prop != "string") {
                        throw `Cannot get unknown property '${String(prop)}'`;
                    }
                    
                    if (prop == "then" || prop == "catch" || prop == "finally") {
                        return undefined;
                    }

                    return (...args: Serializable[]) => this.worker.invoke(prop, args);
                }

                return value;
            },
            set: (target, prop, value, receiver) => {
                console.log(prop);
                
                if (prop in target) {
                    return Reflect.set(target, prop, value, receiver);
                }

                throw `Cannot set unknown property '${String(prop)}'`;
            }
        });
    }

    public async kill(): Promise<void> {
        await this.worker.kill();
    }

    public static async start<T extends ThreadModule>(file: string, base: string): Promise<Thread & T> {
        const ctor: IWorkerCtor = await Thread.getWorker();    
        const worker: IWorker = new ctor(new URL(file, base));
        await worker.init();
        return new Thread(worker) as Thread & T;
    }

    public static async isMaster(): Promise<boolean> {
        const ctor: IWorkerCtor = await Thread.getWorker();
        return await ctor.isMaster();
    }

    private static async getWorker(): Promise<IWorkerCtor> {
        if (typeof window != "undefined" && typeof window.document != "undefined" ||
            typeof WorkerGlobalScope != "undefined" && self instanceof WorkerGlobalScope) {
            // @ts-ignore
            const {BrowserWorker} = await import("./browser/thread.js");
            return BrowserWorker;
        } else {
            // @ts-ignore
            const {NodeJSWorker} = await import("./nodejs/thread.js");
            return NodeJSWorker;
        }
    }
}