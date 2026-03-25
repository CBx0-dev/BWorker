# BWorker (Better Worker)

A lightweight, type-safe library for offloading tasks to background threads in both NodeJS and Browser environments
using a transparent Proxy-based API. While it works seamlessly with bundlers like Vite, it is environment-agnostic and
can be used in any modern environment that supports ES Modules and Web Workers or `worker_threads`.

## Features

- **Type-safe**: Use TypeScript interfaces to define your worker API.
- **Environment Agnostic**: Works in NodeJS (`worker_threads`) and the Browser (`Web Workers`).
- **Transparent API**: Call worker methods as if they were local, thanks to ES6 Proxies.
- **Promise-based**: All worker calls return Promises, making it easy to use with `async/await`.

## Serialization

Only **serializable** parameters and return values can be passed between threads. This means you can use:

- `string`, `number`, `boolean`, `null`, `undefined`
- `Record<string | number, Serializable>` (Plain Objects)
- `Array<Serializable>`

*Note: Classes, functions, and complex objects with methods cannot be passed directly.*

## Installation

```bash
npm install bworker
```

## Usage

### 1. Define your worker

Create a file for your worker logic (e.g., `worker.ts`). Only exported functions will be accessible from the master
thread.

```typescript
// worker.ts
export async function heavyTask(data: number): Promise<number> {
    // Simulate a heavy computation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return data * 2;
}

export function syncTask(text: string): string {
    return `Processed: ${text}`;
}
```

### 2. Implementation Example

BWorker's main advantage is its environment-agnostic API. The following example shows how to start a thread and call
its methods.

```typescript
// main.ts
import {Thread} from "bworker";

// Define the interface for your worker
interface MyWorker {
    heavyTask(data: number): Promise<number>;

    syncTask(text: string): Promise<string>;
}

async function run() {
    const thread = await Thread.start<MyWorker>("./worker.js", import.meta.url);

    console.log("Starting heavy task...");
    const result = await thread.heavyTask(21);
    console.log("Result:", result); // Result: 42

    const text = await thread.syncTask("Hello");
    console.log(text); // Processed: Hello

    await thread.kill();
}

run().catch(console.error);
```

## Browser integration

BWorker works in any modern browser. It is recommended to use a bundler like Vite.
pattern for worker scripts.

### Minimal Vite Configuration (`vite.config.ts`)

To ensure Vite correctly bundles and handles ESM workers, the following minimal configuration is recommended:

```typescript
import * as path from "path";
import {defineConfig} from "vite";

export default defineConfig({
    root: '.',
    build: {
        rolldownOptions: {
            input: {
                main: path.join(__dirname, "index.html"),
                worker: path.join(__dirname, "src/path/to/worker/entry/point.ts"),
            },
            preserveEntrySignatures: 'strict',
            output: {
                entryFileNames: "assets/[name].js"
            }
        },
    }
});
```

| Property                                        | Description                                                                                               |
|:------------------------------------------------|:----------------------------------------------------------------------------------------------------------|
| `root`                                          | The project root directory (where `index.html` is located).                                               |
| `build.rolldownOptions.input`                   | Explicitly defines the entry points for the application and the worker script.                            |
| `build.rolldownOptions.preserveEntrySignatures` | Set to `'strict'` to ensure that the exports of the entry points are preserved exactly.                   |
| `build.rolldownOptions.output.entryFileNames`   | Specifies the naming pattern for the generated asset files. To generate the same name used in the script. |

## API Reference

### `Thread.start<T>(file: string, base: string): Promise<Thread & T>`

Starts a new thread.

- `file`: Path to the worker script.
- `base`: Base URL for resolving the script path (usually `import.meta.url`).
- `T`: Interface defining the worker's exported functions.

### `thread.kill(): Promise<void>`

Terminates the worker thread immediately.

### `Thread.isMaster(): Promise<boolean>`

Utility to check if the current execution context is the master thread.

## Requirements

- **Browser**: Modern browser with ESM Worker support.
- **NodeJS**: v12.17.0+ (for `worker_threads` and ESM support).
- **Bundler**: Recommended to use Vite for the best experience in the browser.

## License

MIT
