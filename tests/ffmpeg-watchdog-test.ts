/**
 * Regression: a wedged ffmpeg core must fail the export, not hang it.
 *
 * ffmpeg.wasm can stop making progress without ever settling the `exec`
 * promise — most often a pthread trapping when the core's fixed 1 GiB heap runs
 * out, which kills that thread and leaves the main one blocked on a futex.
 * `execWithWatchdog` treats a long silence as a wedge and terminates the
 * worker to force the rejection. That is unreproducible against a real core, so
 * the contract is pinned here against a stub that can hang on demand.
 */
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { execWithWatchdog } from "../lib/ffmpeg";
import { en } from "../lib/i18n/messages/en";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Listener = () => void;

/**
 * Minimal stand-in for the parts of `FFmpeg` the watchdog touches. `terminate`
 * rejects the in-flight `exec` exactly as the real class does, which is the
 * mechanism the watchdog relies on to unblock its caller.
 */
class StubFFmpeg {
  terminated = 0;
  lastArgs: string[] | null = null;
  #listeners: Listener[] = [];
  #rejectExec: ((reason: Error) => void) | null = null;

  on(_event: string, callback: Listener) {
    this.#listeners.push(callback);
  }

  off(_event: string, callback: Listener) {
    this.#listeners = this.#listeners.filter((f) => f !== callback);
  }

  /** Emit a log/progress event, i.e. prove the core is still alive. */
  beat() {
    for (const listener of [...this.#listeners]) listener();
  }

  terminate() {
    this.terminated++;
    this.#rejectExec?.(new Error("called FFmpeg.terminate()"));
    this.#rejectExec = null;
  }

  /** Never resolves on its own; only `terminate` can end it. */
  exec(args: string[]): Promise<number> {
    this.lastArgs = args;
    return new Promise((_resolve, reject) => {
      this.#rejectExec = reject;
    });
  }

  asFFmpeg() {
    return this as unknown as FFmpeg;
  }
}

async function expectRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("expected a rejection");
}

/** Short enough to keep the suite quick, long enough to survive CI jitter. */
const TIMEOUT = 60;

async function main() {
  // A run that finishes normally is untouched: no terminate, exit code preserved.
  {
    const stub = new StubFFmpeg();
    stub.exec = async () => 0;
    const code = await execWithWatchdog(stub.asFFmpeg(), ["-i", "in"], TIMEOUT);
    assert(code === 0, "healthy exec returns its exit code");
    assert(stub.terminated === 0, "healthy exec is not terminated");
  }

  // Silence past the budget: terminate the worker and report the stall, not
  // terminate()'s own "called FFmpeg.terminate()" message.
  {
    const stub = new StubFFmpeg();
    const err = await expectRejection(
      execWithWatchdog(stub.asFFmpeg(), ["-i", "in"], TIMEOUT)
    );
    assert(stub.lastArgs?.join(" ") === "-i in", "args reach exec unchanged");
    assert(err instanceof Error, "stall rejects with an Error");
    assert(
      (err as Error).message === en["error.mediaEngineStalled"],
      "stall reports the localizable stall message"
    );
    assert(stub.terminated >= 1, "stall terminates the wedged worker");
  }

  // A slow-but-alive export must survive well past the budget: each log or
  // progress event restarts the clock.
  {
    const stub = new StubFFmpeg();
    const running = execWithWatchdog(stub.asFFmpeg(), ["-i", "in"], TIMEOUT);
    for (let i = 0; i < 6; i++) {
      await sleep(TIMEOUT / 2);
      stub.beat();
    }
    assert(stub.terminated === 0, "heartbeats keep a slow export alive");
    stub.terminate();
    await expectRejection(running);
  }

  // ffmpeg's own failures pass through untouched — replacing them with the stall
  // message would bury the real cause.
  {
    const stub = new StubFFmpeg();
    const boom = new Error("ffmpeg said no");
    stub.exec = async () => {
      throw boom;
    };
    const err = await expectRejection(
      execWithWatchdog(stub.asFFmpeg(), ["-i", "in"], TIMEOUT)
    );
    assert(err === boom, "a real ffmpeg error is not masked by the watchdog");
    assert(stub.terminated === 0, "a real ffmpeg error does not terminate");
  }

  // The timer must not outlive the call: a leaked one would terminate the core
  // mid-way through the *next* export.
  {
    const stub = new StubFFmpeg();
    stub.exec = async () => 0;
    await execWithWatchdog(stub.asFFmpeg(), ["-i", "in"], TIMEOUT);
    await sleep(TIMEOUT * 3);
    assert(stub.terminated === 0, "watchdog timer is cleared once exec settles");
  }

  console.log("ALL FFMPEG WATCHDOG TESTS PASSED");
}

void main();
