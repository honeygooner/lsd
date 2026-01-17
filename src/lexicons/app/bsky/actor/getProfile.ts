// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/getProfile.json

import { Schema } from "effect";
import * as AppBskyActorDefs from "./defs.ts";

export const id = "app.bsky.actor.getProfile";

// main: Get detailed profile view of an actor. Does not require auth, but contains relevant metadata with auth.

export class Params extends Schema.Class<Params>(`${id}#main (params)`)({
  /** Handle or DID of account to fetch profile of. */
  actor: Schema.String, // format: at-identifier
}) {}

export class Output extends Schema.Class<Output>(`${id}#main (output)`)({
  ...AppBskyActorDefs.ProfileViewDetailed.fields,
}) {}
