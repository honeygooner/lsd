// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getAuthorFeed.json

import { Schema } from "effect";
import * as AppBskyFeedDefs from "./defs.ts";

export const id = "app.bsky.feed.getAuthorFeed";

// main: Get a view of an actor's 'author feed' (post and reposts by the author). Does not require auth.

export const Params = Schema.Struct({
  actor: Schema.String, // format: at-identifier
  limit: Schema.optional(Schema.Int.pipe(Schema.between(1, 100))),
  cursor: Schema.optional(Schema.String),
  /** Combinations of post/repost types to include in response. */
  filter: Schema.optional(
    Schema.Array(
      Schema.Literal(
        "posts_with_replies",
        "posts_no_replies",
        "posts_with_media",
        "posts_and_author_threads",
        "posts_with_video",
      ),
    ),
  ),
  includePins: Schema.optional(Schema.Boolean),
});

export const Output = Schema.Struct({
  feed: Schema.Array(AppBskyFeedDefs.FeedViewPost),
  cursor: Schema.optional(Schema.String),
});
