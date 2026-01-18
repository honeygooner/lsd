import { KeyValueStore } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Exit, Function, Layer, Option, Schema, Stream } from "effect";

class Kv extends Effect.Service<Kv>()("Kv", {
  dependencies: [Layer.provide(KeyValueStore.layerFileSystem("data"), NodeContext.layer)],
  effect: Effect.map(KeyValueStore.KeyValueStore, (keyValueStore) => ({
    recovery: Function.pipe(
      keyValueStore.forSchema(Schema.Union(Schema.String, Schema.Number)),
      KeyValueStore.prefix("recovery"),
    ),
  })),
}) {}

export const Fs = Kv.Default;

/**
 * similar to {@linkcode Stream.paginateChunkEffect} but accepts a deterministic `key` used to
 * recover the current page in the event of an outage
 */
export const createRecoverableStream = <Cursor extends string | number | undefined, A, E, R>(
  key: string,
  ...[initialCursor, paginate]: Parameters<typeof Stream.paginateChunkEffect<Cursor, A, E, R>>
) =>
  Stream.unwrap(
    Kv.use(({ recovery }) =>
      Function.pipe(
        recovery.get(key),
        Effect.map(Option.getOrElse(() => initialCursor)),
        Effect.map((cursor) =>
          Function.pipe(
            Stream.paginateChunkEffect(cursor, (currentCursor) =>
              Effect.zipRight(
                currentCursor === undefined ? Effect.void : recovery.set(key, currentCursor),
                paginate(currentCursor as Cursor),
              ),
            ),
            Stream.ensuringWith(
              Exit.match({
                onFailure: () => Effect.void,
                onSuccess: () => Effect.orDie(recovery.remove(key)),
              }),
            ),
          ),
        ),
      ),
    ),
  );
