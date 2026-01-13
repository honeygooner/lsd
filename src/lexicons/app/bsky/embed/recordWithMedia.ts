// A representation of a record embedded in a Bluesky record (eg, a post), alongside other
// compatible embeds. For example, a quote post and image, or a quote post and external URL card.
// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/embed/recordWithMedia.json

import { Schema } from "effect";
import * as AppBskyEmbedImages from "./images.ts";
import * as AppBskyEmbed$Any from "./$any.ts";

export const id = "app.bsky.embed.recordWithMedia";

export class Main extends Schema.Class<Main>(id)({
  record: Schema.Unknown,
  media: Schema.Union(AppBskyEmbedImages.Main, AppBskyEmbed$Any.Main),
}) {}
