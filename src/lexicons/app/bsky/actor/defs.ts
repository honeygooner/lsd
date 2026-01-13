// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/defs.json

import { Equal, Hash, Schema } from "effect";

export class ProfileViewDetailed
  extends Schema.Class<ProfileViewDetailed>("app.bsky.actor.defs#profileViewDetailed")({
    did: Schema.String, // format: did
    handle: Schema.String, // format: handle
  })
  implements Equal.Equal
{
  [Equal.symbol] = (that: Equal.Equal) =>
    that instanceof ProfileViewDetailed && Equal.equals(this.did, that.did);

  [Hash.symbol] = () => Hash.hash(this.did);
}
