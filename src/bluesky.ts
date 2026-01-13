import { Option } from "effect";
import { makeQuery, XrpcClient } from "./xrpc.ts";
import * as AppBskyActorGetProfile from "./lexicons/app/bsky/actor/getProfile.ts";

export const AppView = XrpcClient.Default("https://api.bsky.app");
export const AppViewCached = XrpcClient.Default("https://public.api.bsky.app");

export const getProfile = makeQuery(AppBskyActorGetProfile);

export const getIdentifierFromProfileUrl = (url: string | URL) =>
  Option.fromNullable(profileUrlPattern.exec(url.toString())?.pathname.groups.identifier);

const profileUrlPattern = new URLPattern("https://bsky.app/profile/:identifier");
