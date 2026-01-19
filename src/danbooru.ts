import { HttpClient, HttpClientRequest } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Chunk, Effect, Function, Hash, Option, Schedule, Schema } from "effect";
import * as Kv from "./kv.ts";
import pkg from "../package.json" with { type: "json" };

/** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters | Danbooru Wiki | help:common url parameters} */
class DanbooruParams extends Schema.Class<DanbooruParams>("DanbooruParams")({
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-limit | Danbooru Wiki | help:common url parameters} */
  limit: Schema.optional(Schema.extend(Schema.Positive, Schema.Int)),
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-page | Danbooru Wiki | help:common url parameters} */
  page: Schema.optional(
    Schema.Union(
      Schema.String.pipe(Schema.pattern(/^[ab][1-9][0-9]*$/)),
      Schema.extend(Schema.Positive, Schema.Int),
    ),
  ),
}) {}

/** @see {@link https://github.com/danbooru/danbooru/blob/757a709/app/controllers/application_controller.rb#L172 | danbooru/app/controllers/application_controller.rb#L172} */
class DanbooruError extends Schema.Class<DanbooruError>("DanbooruError")({
  success: Schema.Literal(false),
  message: Schema.String,
  error: Schema.NullOr(Schema.String),
  backtrace: Schema.NullOr(Schema.Array(Schema.String)),
}) {
  readonly _tag = "DanbooruError";
}

class DanbooruClient extends Effect.Service<DanbooruClient>()("DanbooruClient", {
  dependencies: [NodeHttpClient.layer],
  effect: (baseUrl: string) =>
    Effect.map(HttpClient.HttpClient, (httpClient) =>
      Function.pipe(
        httpClient,
        HttpClient.mapRequest(
          Function.flow(
            HttpClientRequest.prependUrl(baseUrl),
            HttpClientRequest.setHeader("Accept", "application/json"),
            HttpClientRequest.setHeader("User-Agent", `${pkg.name}/${pkg.version} (${pkg.repository.url})`), // prettier-ignore
            HttpClientRequest.setUrlParam("format", "json"),
          ),
        ),
        HttpClient.filterStatusOk,
        HttpClient.catchTag("ResponseError", (responseError) =>
          responseError.reason !== "StatusCode"
            ? Effect.fail(responseError)
            : Function.pipe(
                responseError.response.json,
                Effect.flatMap(Schema.decodeUnknown(DanbooruError)),
                Effect.flatMap((danbooruError) => Effect.fail(danbooruError)),
              ),
        ),
        HttpClient.retryTransient({
          schedule: Schedule.jittered(Schedule.exponential("125 millis")),
          times: 5,
        }),
      ),
    ),
}) {}

export const Danbooru = DanbooruClient.Default("https://danbooru.donmai.us");
export const Testbooru = DanbooruClient.Default("https://testbooru.donmai.us");

/** @see {@link https://github.com/danbooru/danbooru/blob/757a709/db/structure.sql#L253-L260 | danbooru/db/structure.sql#L253-L260} */
class ArtistUrl extends Schema.Class<ArtistUrl>("ArtistUrl")({
  id: Schema.Number,
  artist_id: Schema.Number,
  url: Schema.String,
  created_at: Schema.DateFromString,
  updated_at: Schema.DateFromString,
  is_active: Schema.Boolean,
}) {}

class GetArtistUrlsParams extends Schema.Class<GetArtistUrlsParams>("GetArtistUrlsParams")({
  ...DanbooruParams.fields,
  "search[url_matches]": Schema.optional(Schema.String),
}) {}

export function getArtistUrls(params?: GetArtistUrlsParams) {
  return DanbooruClient.use((client) =>
    Function.pipe(
      params,
      Schema.encode(Schema.UndefinedOr(GetArtistUrlsParams)),
      Effect.flatMap((urlParams) => client.get("/artist_urls", { urlParams })),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(Schema.decodeUnknown(Schema.Array(ArtistUrl))),
    ),
  );
}

export function getArtistUrlsStream(params?: GetArtistUrlsParams) {
  const hashableParams = new GetArtistUrlsParams({ ...params, limit: undefined, page: undefined });
  const key = Function.pipe(
    Hash.string(`${DanbooruClient.key}:${getArtistUrlsStream.name}`),
    Hash.combine(Hash.hash(hashableParams)),
    (hash) => Hash.optimize(hash).toString(16),
  );

  return Kv.createRecoverableStream(key, params?.page, (page) =>
    getArtistUrls({ ...params, page }).pipe(
      Effect.map((artistUrls) => [
        Chunk.fromIterable(artistUrls),
        Option.map(Option.fromNullable(artistUrls.at(-1)), ({ id }) => `b${id}`),
      ]),
    ),
  );
}
