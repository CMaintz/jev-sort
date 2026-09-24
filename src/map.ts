function toAsyncIterator<T>(source: Iterable<T> | AsyncIterable<T>): AsyncIterator<T> {
  if (Symbol.asyncIterator in source) return (source as AsyncIterable<T>)[Symbol.asyncIterator]();
  const sync = (source as Iterable<T>)[Symbol.iterator]();
  return { next: () => Promise.resolve(sync.next()) };
}

/**
 * Map a (possibly async, possibly infinite) source through `fn` with bounded
 * concurrency, yielding results as they complete. Memory stays flat — at most
 * `concurrency` items are in flight — so it streams million-row inputs. Order is
 * not preserved (each output row is self-contained, so joins don't need it).
 */
export async function* mapPool<T, R>(
  source: Iterable<T> | AsyncIterable<T>,
  concurrency: number,
  fn: (item: T) => Promise<R>,
): AsyncGenerator<R> {
  const it = toAsyncIterator(source);
  const running = new Map<number, Promise<{ key: number; value: R }>>();
  let key = 0;
  let drained = false;

  const start = async (): Promise<void> => {
    if (drained) return;
    const next = await it.next();
    if (next.done) {
      drained = true;
      return;
    }
    const k = key++;
    running.set(
      k,
      fn(next.value).then((value) => ({ key: k, value })),
    );
  };

  const width = Math.max(1, concurrency);
  while (running.size < width && !drained) await start();
  while (running.size > 0) {
    const { key: k, value } = await Promise.race(running.values());
    running.delete(k);
    yield value;
    await start();
  }
}
