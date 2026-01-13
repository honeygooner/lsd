// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/getProfile.json

import { Schema } from "effect";
import { ProfileViewDetailed } from "./defs.ts";

export const id = "app.bsky.actor.getProfile";

export const Params = Schema.Struct({
  /** Handle or DID of account to fetch profile of. */
  actor: Schema.String, // format: at-identifier
});

export const Output = ProfileViewDetailed;
