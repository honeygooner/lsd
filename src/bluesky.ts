import { Agent } from "@atproto/api";
import { Data, Effect, Option } from "effect";

class BlueskyError extends Data.TaggedError("BlueskyError")<{ cause?: unknown }> {}

class Bluesky extends Effect.Service<Bluesky>()("Bluesky", {
  sync: () => ({ agent: new Agent("https://public.api.bsky.app") }),
}) {}

export const layer = Bluesky.Default;

/** @see {@link https://docs.bsky.app/docs/api/app-bsky-actor-get-profile | Bluesky | app.bsky.actor.getProfile} */
export const getProfile = wrapMethod((agent) => agent.getProfile);

export const getIdentifierFromProfileUrl = (url: string | URL) => {
  const group = "identifier";
  const pattern = new URLPattern(`https://bsky.app/profile/:${group}`);
  return Option.fromNullable(pattern.exec(String(url))?.pathname.groups[group]);
};

function wrapMethod<Params, Options extends { signal?: AbortSignal }, Response>(
  callback: (agent: Agent) => (params?: Params, options?: Options) => PromiseLike<Response>,
) {
  return (params?: Params, options?: Options) =>
    Effect.tryMapPromise(Bluesky, {
      try: (bluesky, signal) =>
        callback(bluesky.agent).call(bluesky.agent, params, {
          ...options,
          signal: options?.signal ? AbortSignal.any([options.signal, signal]) : signal,
        } as Options),
      catch: (error) => new BlueskyError({ cause: error }),
    });
}
