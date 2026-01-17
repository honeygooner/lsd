import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Chunk, Effect, Function, Option, Schedule, Schema, Stream } from "effect";
import { unsafeSchemaMake, USER_AGENT } from "./utils.ts";

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
class DanbooruError extends Schema.TaggedError<DanbooruError>()("DanbooruError", {
  success: Schema.Literal(false),
  message: Schema.String,
  error: Schema.NullOr(Schema.String),
  backtrace: Schema.NullOr(Schema.Array(Schema.String)),
}) {}

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
            HttpClientRequest.setHeader("User-Agent", USER_AGENT),
            HttpClientRequest.setUrlParam("format", "json"),
          ),
        ),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential("125 millis"),
          times: 5,
        }),
        HttpClient.catchTag("ResponseError", (responseError) =>
          Effect.flatMap(responseError.response.json, unsafeSchemaMake(DanbooruError)),
        ),
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
  const urlParams = { ...unsafeSchemaMake(GetArtistUrlsParams)(params) };
  return Function.pipe(
    DanbooruClient.use((client) => client.get("/artist_urls", { urlParams })),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(ArtistUrl))),
  );
}

export function getArtistUrlsStream(params?: GetArtistUrlsParams) {
  return Stream.paginateChunkEffect(params?.page, (page) =>
    getArtistUrls({ ...params, page }).pipe(
      Effect.map((artistUrls) => [
        Chunk.fromIterable(artistUrls),
        Option.map(Option.fromNullable(artistUrls.at(-1)), ({ id }) => `b${id}`),
      ]),
    ),
  );
}
