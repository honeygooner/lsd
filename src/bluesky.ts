import { Chunk, Effect, Option, Stream } from "effect";
import * as AppBskyActorGetProfile from "./lexicons/app/bsky/actor/getProfile.ts";
import * as AppBskyFeedGetAuthorFeed from "./lexicons/app/bsky/feed/getAuthorFeed.ts";
import { makeQuery, XrpcClient } from "./xrpc.ts";

const APP_VIEW_URL = "https://api.bsky.app";
const APP_VIEW_CACHED_URL = "https://public.api.bsky.app";
const BLUESKY_URL = "https://bsky.app";
const PROFILE_URL_PATTERN = new URLPattern("/profile/:identifier", BLUESKY_URL);

export const AppView = XrpcClient.Default(APP_VIEW_URL);
export const AppViewCached = XrpcClient.Default(APP_VIEW_CACHED_URL);

export const getAuthorFeed = makeQuery(AppBskyFeedGetAuthorFeed);
export const getAuthorFeedStream = (...[params]: Parameters<typeof getAuthorFeed>) =>
  Stream.paginateChunkEffect(params.cursor, (cursor) =>
    Effect.map(getAuthorFeed({ ...params, cursor }), (output) => [
      Chunk.fromIterable(output.feed),
      Option.fromNullable(output.cursor),
    ]),
  );

export const getProfile = makeQuery(AppBskyActorGetProfile);

export const getBlobUrlFromCid = (did: string, cid: string, base = APP_VIEW_URL) =>
  `${base}/blob/${did}/${cid}`;

export const getIdentifierFromProfileUrl = (url: string | URL) =>
  Option.fromNullable(PROFILE_URL_PATTERN.exec(url.toString())?.pathname.groups.identifier);
