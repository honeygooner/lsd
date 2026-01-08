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
  Stream.tap(Effect.log),
  Stream.runDrain,
);

Function.pipe(
  program,
  Effect.provide([Danbooru.makeLayer("testbooru")]),
  NodeRuntime.runMain({ disablePrettyLogger: true }),
);
