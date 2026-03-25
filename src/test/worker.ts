export async function foo(x: number): Promise<void> {
    for (let i = 0; i < x; i++) {
        console.log("[WORKER] Hello world");
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1000))
    }
}