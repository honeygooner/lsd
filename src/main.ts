import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, HashSet, Logger, LogLevel, Option, Sink, Stream } from "effect";
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
        Bluesky.use((agent, signal) => agent.getProfile({ actor }, { signal })),
        Effect.tap(() => Effect.logDebug()),
        Effect.tapErrorCause((cause) => Effect.logWarning(cause)),
        Effect.annotateLogs({ actor }),
        Effect.option,
      ),
    { concurrency: 10 },
  ),
  Stream.filterMap(Option.map(({ data }) => data.did)),
  Stream.run(Sink.collectAllToSet()),
  Effect.tap((hashSet) => Effect.logInfo(`${HashSet.size(hashSet)} artists`)),
);

Function.pipe(
  Effect.provide(program, [Bluesky.Live, Danbooru.Test]),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
);
