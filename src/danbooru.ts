import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Array, Chunk, Data, Effect, Function, Option, Schema, Stream } from "effect";
import { USER_AGENT } from "./util.ts";

class DanbooruError extends Data.TaggedError("DanbooruError") {
  constructor(fields: typeof DanbooruError.ResponseSchema.Type) {
    super();
    this.name = fields.error || super.name;
    this.message = fields.message;
    this.stack = fields.backtrace?.join("\n");
  }

  static readonly ResponseSchema = Schema.Struct({
    success: Schema.Literal(false),
    message: Schema.String,
    error: Schema.NullOr(Schema.String),
    backtrace: Schema.NullOr(Schema.Array(Schema.String)),
  });
}

class Danbooru extends Effect.Service<Danbooru>()("Danbooru", {
  dependencies: [NodeHttpClient.layer],
  scoped: (baseUrl: string) =>
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
        HttpClient.catchTag("ResponseError", (error) =>
          Function.pipe(
            error.response.json,
            Effect.flatMap(Schema.decodeUnknown(DanbooruError.ResponseSchema)),
            Effect.flatMap((fields) => new DanbooruError(fields)),
          ),
        ),
      ),
    ),
}) {}

export const Live = Danbooru.Default("https://danbooru.donmai.us");
export const Test = Danbooru.Default("https://testbooru.donmai.us");

class ArtistUrl extends Schema.Class<ArtistUrl>("ArtistUrl")({
  id: Schema.Number,
  artist_id: Schema.Number,
  url: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
  is_active: Schema.Boolean,
}) {}

export const getArtistUrls = (urlParams?: CommonUrlParameters) =>
  Effect.flatMap(
    Danbooru.use((danbooru) => danbooru.get("/artist_urls", { urlParams })),
    HttpClientResponse.schemaBodyJson(Schema.Array(ArtistUrl)),
  );

export const getArtistUrlsStream = (urlParams?: CommonUrlParameters) =>
  Stream.paginateChunkEffect(urlParams?.page, (page) =>
    Effect.map(getArtistUrls({ ...urlParams, page }), (artistUrls) => [
      Chunk.fromIterable(artistUrls),
      Option.map(Array.last(artistUrls), ({ id }) => `b${id}` as const),
    ]),
  );

/** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters | Danbooru Wiki | help:common url parameters} */
type CommonUrlParameters = {
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-limit | Danbooru Wiki | help:common url parameters} */
  readonly limit?: number;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-page | Danbooru Wiki | help:common url parameters} */
  readonly page?: number | `a${number}` | `b${number}`;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-search | Danbooru Wiki | help:common url parameters} */
  readonly search?: UrlParams.CoercibleRecord;
};
