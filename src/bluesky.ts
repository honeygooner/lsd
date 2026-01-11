import { Agent } from "@atproto/api";
import { XRPCError } from "@atproto/xrpc";
import { Effect, Option, Schema } from "effect";

class Bluesky extends Effect.Service<Bluesky>()("Bluesky", {
  sync: () => ({ agent: new Agent("https://public.api.bsky.app") }),
}) {}

export const Live = Bluesky.Default;

/** @see {@link https://docs.bsky.app/docs/api/app-bsky-actor-get-profile | Bluesky | app.bsky.actor.getProfile} */
export const getProfile = (actor: string) =>
  Effect.tryMapPromise(Bluesky, {
    try: ({ agent }, signal) => agent.getProfile({ actor }, { signal }),
    catch: Schema.decodeUnknownSync(Schema.instanceOf(XRPCError)),
  });

export const getIdentifierFromProfileUrl = (url: string | URL) => {
  const group = "identifier";
  const pattern = new URLPattern(`https://bsky.app/profile/:${group}`);
  return Option.fromNullable(pattern.exec(String(url))?.pathname.groups[group]);
};
