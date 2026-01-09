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
  Stream.changesWith((a, b) => a.data.did === b.data.did),
  Stream.tap(({ data }) => Effect.log(data.did)),
  Stream.runDrain,
);

Function.pipe(
  Effect.provide(program, [Bluesky.layer, Danbooru.makeLayer("testbooru")]),
  NodeRuntime.runMain(),
);
