import { SerializedSaveQueue } from "./serialized-save-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("SerializedSaveQueue", () => {
  it("serializes writes and persists the newest value after an in-flight write", async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    const persist = jest
      .fn<Promise<void>, [string]>()
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise);
    const queue = new SerializedSaveQueue<string>("initial", persist);

    queue.update("older");
    const flush = queue.flush();
    await Promise.resolve();
    queue.update("newest");

    firstWrite.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(persist.mock.calls.map(([value]) => value)).toEqual([
      "older",
      "newest",
    ]);

    secondWrite.resolve();
    await flush;
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("allows a failed save to be retried", async () => {
    const persist = jest
      .fn<Promise<void>, [string]>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce();
    const queue = new SerializedSaveQueue<string>("initial", persist);
    queue.update("latest");

    await expect(queue.flush()).rejects.toThrow("temporary failure");
    await expect(queue.flush()).resolves.toBeUndefined();
    expect(persist.mock.calls.map(([value]) => value)).toEqual([
      "latest",
      "latest",
    ]);
  });
});
