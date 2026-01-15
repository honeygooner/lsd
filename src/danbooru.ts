import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Chunk, Data, Effect, Function, Option, Schedule, Schema, Stream } from "effect";
import pkg from "../package.json" with { type: "json" };

/** @see {@link https://github.com/danbooru/danbooru/blob/757a709/app/controllers/application_controller.rb#L172 | danbooru/app/controllers/application_controller.rb#L172} */
class DanbooruError extends Schema.Class<DanbooruError>("DanbooruError")({
  success: Schema.Literal(false),
  message: Schema.String,
  error: Schema.NullOr(Schema.String),
  backtrace: Schema.NullOr(Schema.Array(Schema.String)),
}) {}

/** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters | Danbooru Wiki | help:common url parameters} */
class DanbooruParams extends Schema.Class<DanbooruParams>("DanbooruParams")({
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-limit | Danbooru Wiki | help:common url parameters} */
  limit: Schema.optional(Schema.NumberFromString),
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-page | Danbooru Wiki | help:common url parameters} */
  page: Schema.optional(Schema.Union(Schema.String, Schema.NumberFromString)),
}) {}

/** @see {@link https://github.com/danbooru/danbooru/blob/757a709/db/structure.sql#L253-L260 | danbooru/db/structure.sql#L253-L260} */
class ArtistUrl extends Schema.Class<ArtistUrl>("ArtistUrl")({
  id: Schema.Number,
  artist_id: Schema.Number,
  url: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
  is_active: Schema.Boolean,
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
            HttpClientRequest.setHeader("User-Agent", `${pkg.name}/${pkg.version} (${pkg.repository.url})`), // prettier-ignore
            HttpClientRequest.setUrlParam("format", "json"),
          ),
        ),
        HttpClient.mapRequestEffect((request) =>
          Function.pipe(
            request.urlParams,
            UrlParams.schemaStruct(DanbooruParams),
            Effect.as(request),
          ),
        ),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential("125 millis"),
          times: 5,
        }),
        HttpClient.catchTag("ResponseError", (responseError) =>
          Function.pipe(
            responseError.response.json,
            Effect.flatMap(Schema.decodeUnknown(DanbooruError)),
            Effect.flatMap((danbooruError) => new DanbooruClientError(danbooruError)),
          ),
        ),
      ),
    ),
}) {}

class DanbooruClientError extends Data.TaggedError("DanbooruClientError")<DanbooruError> {}

export const Danbooru = DanbooruClient.Default("https://danbooru.donmai.us");
export const Testbooru = DanbooruClient.Default("https://testbooru.donmai.us");

export function getArtistUrls(urlParams?: DanbooruParams & UrlParams.CoercibleRecord) {
  return Effect.flatMap(
    DanbooruClient.use((client) => client.get("/artist_urls", { urlParams })),
    HttpClientResponse.schemaBodyJson(Schema.Array(ArtistUrl)),
  );
}

export function getArtistUrlsStream(urlParams?: DanbooruParams & UrlParams.CoercibleRecord) {
  return Stream.paginateChunkEffect(urlParams?.page, (page) =>
    Effect.map(getArtistUrls({ ...urlParams, page }), (artistUrls) => [
      Chunk.fromIterable(artistUrls),
      Option.map(Option.fromNullable(artistUrls.at(-1)), ({ id }) => `b${id}`),
    ]),
  );
}
