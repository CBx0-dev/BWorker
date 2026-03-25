import {Thread} from "../index.js";

console.log("[MASTER] Start thread...");

const thread = await Thread.start<{
    foo(x: number): Promise<number>;
}>(new URL("./worker.js", import.meta.url));

console.log("[MASTER] Thread started");

const task = thread.foo(10);
for (let i = 0; i < 5; i++) {
    console.log("[MASTER] Hello world");
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000))
}

await task;


console.log("[MASTER] Kill thread...");
await thread.kill();
console.log("[MASTER] Thread killed");