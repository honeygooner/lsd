import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, Logger, LogLevel, Stream } from "effect";
import * as Bluesky from "./bluesky.ts";
import * as Danbooru from "./danbooru.ts";
import * as Kv from "./kv.ts";

const program = Function.pipe(
  Danbooru.getArtistUrlsStream({
    limit: 100,
    "search[url_matches]": "*://bsky.app/profile/*",
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
    { concurrency: 0b1000 },
  ),
  Stream.runDrain,
);

Function.pipe(
  Effect.provide(program, [Bluesky.AppViewCached, Danbooru.Testbooru, Kv.Fs]),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
);
