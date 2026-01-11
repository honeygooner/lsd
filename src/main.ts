import { NodeRuntime } from "@effect/platform-node";
import { Effect, Function, Stream } from "effect";
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
  Stream.mapEffect((actor) => Effect.option(Bluesky.getProfile(actor)), {
    concurrency: 5,
  }),
  Stream.filterMap(Function.identity),
  Stream.changesWith((a, b) => a.data.did === b.data.did),
  Stream.tap(({ data }) => Effect.log(data.did)),
  Stream.runDrain,
);

Function.pipe(Effect.provide(program, [Bluesky.layer, Danbooru.layerTest]), NodeRuntime.runMain());
