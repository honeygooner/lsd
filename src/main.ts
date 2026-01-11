import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, Logger, LogLevel, Stream } from "effect";
import * as Bluesky from "./bluesky.ts";
import * as Danbooru from "./danbooru.ts";

const program = Function.pipe(
  Danbooru.getArtistUrlsStream({
    limit: 1000,
    search: {
      url_matches: "*://bsky.app/profile/*",
    },
  }),
  Stream.filterMap(({ url }) => Bluesky.getIdentifierFromProfileUrl(url)),
  Stream.mapEffect(
    (actor) =>
      Effect.matchCauseEffect(Bluesky.getProfile(actor), {
        onFailure: (cause) => Effect.tap(Effect.succeedNone, Effect.logWarning(cause, actor)),
        onSuccess: (response) => Effect.tap(Effect.succeedSome(response), Effect.logDebug(actor)),
      }),
    { concurrency: 10 },
  ),
  Stream.filterMap(Function.identity),
  Stream.changesWith((a, b) => a.data.did === b.data.did),
  Stream.runDrain,
);

Function.pipe(
  Effect.provide(program, [Bluesky.Live, Danbooru.Test]),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
);
