import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Chunk, Data, Effect, Function, Option, RateLimiter, Schema, Stream } from "effect";
import { USER_AGENT } from "./util.ts";

class DanbooruError extends Data.TaggedError("DanbooruError")<typeof DanbooruError.Fields.Type> {
  static readonly Fields = Schema.Struct({
    success: Schema.Literal(false),
    error: Schema.String,
    message: Schema.String,
    backtrace: Schema.NullOr(Schema.Array(Schema.String)),
  });
}

class Danbooru extends Effect.Service<Danbooru>()("Danbooru", {
  dependencies: [NodeHttpClient.layer],
  scoped: (
    server: "danbooru" | "testbooru",
    rateLimiterOptions: RateLimiter.RateLimiter.Options = {
      algorithm: "fixed-window",
      interval: "1 second",
      limit: 5,
    },
  ) =>
    Effect.flatMap(RateLimiter.make(rateLimiterOptions), (rateLimiter) =>
      Effect.map(
        HttpClient.HttpClient,
        Function.flow(
          HttpClient.mapRequest(HttpClientRequest.setHeader("Accept", "application/json")),
          HttpClient.mapRequest(HttpClientRequest.setHeader("User-Agent", USER_AGENT)),
          HttpClient.mapRequest(HttpClientRequest.prependUrl(`https://${server}.donmai.us`)),
          HttpClient.transform(rateLimiter),
          HttpClient.transformResponse(
            Effect.flatMap(
              HttpClientResponse.matchStatus({
                "2xx": (response) => Effect.succeed(response),
                orElse: (response) =>
                  Function.pipe(
                    Effect.flatMap(response.json, Schema.decodeUnknown(DanbooruError.Fields)),
                    Effect.flatMap((fields) => new DanbooruError(fields)),
                  ),
              }),
            ),
          ),
        ),
      ),
    ),
}) {}

export const makeLayer = Danbooru.Default.bind(Danbooru);

export const getArtistUrls = getItems(
  HttpClientRequest.get("/artist_urls.json"),
  Schema.Struct({
    id: Schema.Number,
    artist_id: Schema.Number,
    url: Schema.String,
    created_at: Schema.Date,
    updated_at: Schema.Date,
    is_active: Schema.Boolean,
  }),
  ["id", "url"],
);
export const getArtistUrlsStream = getItemsStream(getArtistUrls);

function getItems<A, I, R, Keys extends ReadonlyArray<keyof A & keyof I>>(
  request: HttpClientRequest.HttpClientRequest,
  itemSchema: Schema.Schema<A, I, R>,
  keys: Keys,
) {
  const schema = Function.pipe(itemSchema, Schema.pick(...keys), Schema.Array);
  const makeRequest = (urlParams?: UrlParams.CoercibleRecord) =>
    HttpClientRequest.modify(request, {
      urlParams: Function.pipe(
        request.urlParams,
        UrlParams.appendAll(urlParams ?? []),
        UrlParams.set("only", keys.join(",")),
      ),
    });

  return (urlParams?: UrlParams.CoercibleRecord) =>
    Effect.flatMap(
      Danbooru.use((client) => client.execute(makeRequest(urlParams))),
      HttpClientResponse.schemaBodyJson(schema),
    );
}

function getItemsStream<Item extends { readonly id: number }, E, R>(
  getItems: (urlParams?: UrlParams.CoercibleRecord) => Effect.Effect<ReadonlyArray<Item>, E, R>,
) {
  return (urlParams?: UrlParams.CoercibleRecord) =>
    Stream.paginateChunkEffect(undefined as string | undefined, (page) =>
      Effect.map(getItems({ ...urlParams, page }), (items) => [
        Chunk.fromIterable(items),
        Option.map(Option.fromNullable(items.at(-1)), (item) => `b${item.id}`),
      ]),
    );
}
