import { Agent } from "@atproto/api";
import { XRPCError } from "@atproto/xrpc";
import { Effect, Option, Schema } from "effect";

class Bluesky extends Effect.Service<Bluesky>()("Bluesky", {
  sync: () => ({ agent: new Agent("https://public.api.bsky.app") }),
}) {}

export const Live = Bluesky.Default;

export const use = <A>(callback: (agent: Agent, signal: AbortSignal) => PromiseLike<A>) =>
  Effect.tryMapPromise(Bluesky, {
    try: ({ agent }, signal) => callback(agent, signal),
    catch: Schema.decodeUnknownSync(Schema.instanceOf(XRPCError)),
  });

export const getIdentifierFromProfileUrl = (url: string | URL) => {
  const group = "identifier";
  const pattern = new URLPattern(`https://bsky.app/profile/:${group}`);
  return Option.fromNullable(pattern.exec(String(url))?.pathname.groups[group]);
};
