// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/post.json

import { Schema } from "effect";
import * as AppBskyEmbedImages from "../embed/images.ts";
import * as AppBskyEmbedRecordWithMedia from "../embed/recordWithMedia.ts";
import * as AppBskyEmbed$Any from "../embed/$any.ts";

export const id = "app.bsky.feed.post";

/** Record containing a Bluesky post. */
export class Main extends Schema.Class<Main>(id)({
  $type: Schema.optional(Schema.Literal(id)),
  /** The primary post content. May be an empty string, if there are embeds. */
  text: Schema.String,
  /** Client-declared timestamp when this post was originally created. */
  createdAt: Schema.String, // format: datetime
  embed: Schema.optional(
    Schema.Union(AppBskyEmbedImages.Main, AppBskyEmbedRecordWithMedia.Main, AppBskyEmbed$Any.Main),
  ),
}) {}
