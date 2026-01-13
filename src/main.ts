import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, HashSet, Logger, LogLevel, Sink, Stream } from "effect";
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
      Function.pipe(
        Bluesky.getProfile({ actor }),
        Effect.tap(() => Effect.logDebug()),
        Effect.tapErrorCause((cause) => Effect.logWarning(cause)),
        Effect.annotateLogs({ actor }),
        Effect.option,
      ),
    { concurrency: 10 },
  ),
  Stream.filterMap(Function.identity),
  Stream.run(Sink.collectAllToSet()),
  Effect.tap((hashSet) => Effect.logInfo(`${HashSet.size(hashSet)} artists`)),
);

Function.pipe(
  Effect.provide(program, [Bluesky.AppViewCached, Danbooru.Test]),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
);
