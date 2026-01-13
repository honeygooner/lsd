// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/defs.json

import { Schema } from "effect";

export const id = "app.bsky.actor.defs";

export class ProfileViewBasic extends Schema.Class<ProfileViewBasic>(`${id}#profileViewBasic`)({
  did: Schema.String, // format: did
  handle: Schema.String, // format: handle
}) {}

export class ProfileViewDetailed extends ProfileViewBasic.extend<ProfileViewDetailed>(
  `${id}#profileViewDetailed`,
)({}) {}
