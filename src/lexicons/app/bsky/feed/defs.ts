// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/defs.json

import { Schema } from "effect";
import * as AppBskyActorDefs from "../actor/defs.ts";

export const id = "app.bsky.feed.defs";

export class PostView extends Schema.Class<PostView>(`${id}#postView`)({
  uri: Schema.String, // format: at-uri
  cid: Schema.String, // format: cid
  author: AppBskyActorDefs.ProfileViewBasic,
  record: Schema.Unknown,
  indexedAt: Schema.String, // format: datetime
}) {}

export class FeedViewPost extends Schema.Class<FeedViewPost>(`${id}#feedViewPost`)({
  post: PostView,
}) {}
