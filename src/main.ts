import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, Stream } from "effect";
import * as Bluesky from "./bluesky.ts";
import * as Danbooru from "./danbooru.ts";

const program = Function.pipe(
  Danbooru.getArtistUrlsStream({
    limit: 1000,
    only: ["id", "url"],
    search: {
      url_matches: "*://bsky.app/profile/*",
    },
  }),
  Stream.filterMap(({ url }) => Bluesky.getIdentifierFromProfileUrl(url)),
  Stream.mapEffect((actor) => Bluesky.getProfile({ actor }).pipe(Effect.option), {
    concurrency: 5,
  }),
  Stream.filterMap(Function.identity),
  Stream.map(({ data }) => data.did),
  Stream.changes,
  Stream.tap(Effect.log),
  Stream.runDrain,
);

Function.pipe(
  Effect.provide(program, [Bluesky.layer, Danbooru.makeLayer("testbooru")]),
  NodeRuntime.runMain(),
);
