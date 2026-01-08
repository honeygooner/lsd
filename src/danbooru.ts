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
        Function.compose(
          HttpClient.mapRequest(
            Function.flow(
              HttpClientRequest.prependUrl(`https://${server}.donmai.us`),
              HttpClientRequest.setHeader("Accept", "application/json"),
              HttpClientRequest.setHeader("User-Agent", USER_AGENT),
              HttpClientRequest.setUrlParam("format", "json"),
            ),
          ),
          HttpClient.transformResponse((effect) =>
            Effect.flatMap(
              rateLimiter(effect),
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
);
export const getArtistUrlsStream = getItemsStream(getArtistUrls);

function getItems<A, I, R>(
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<A, I, R>,
) {
  return <Keys extends readonly (keyof A & keyof I & string)[]>(
    urlParams?: CommonUrlParameters<Keys>,
  ) => {
    const keys = urlParams?.only;
    const newRequest = HttpClientRequest.modify(request, {
      urlParams: {
        ...urlParams,
        ...(keys && { only: keys.join(",") }),
      },
    });

    // NOTE: all this tomfoolery is typescript wizardry to get `getItemsStream` working easily...
    // luckily, this also has the added benefit of improving hover tooltips :D
    const pick = (keys: Keys) => schema.pipe(Schema.pick(...keys));
    const newSchema = keys
      ? (pick(keys) as Keys extends undefined ? never : ReturnType<typeof pick>)
      : (schema as Keys extends undefined ? typeof schema : never);

    return Effect.flatMap(
      Danbooru.use((client) => client.execute(newRequest)),
      HttpClientResponse.schemaBodyJson(Schema.Array(newSchema)),
    );
  };
}

function getItemsStream<Keys extends readonly string[], Item extends { readonly id: number }, E, R>(
  getItems: (urlParams?: CommonUrlParameters<Keys>) => Effect.Effect<readonly Item[], E, R>,
) {
  return (urlParams?: CommonUrlParameters<Keys>) =>
    Stream.paginateChunkEffect(undefined as CommonUrlParameters<Keys>["page"], (page) =>
      Effect.map(getItems({ ...urlParams, page }), (items) => [
        Chunk.fromIterable(items),
        Option.map(Option.fromNullable(items.at(-1)), (item) => `b${item.id}` as const),
      ]),
    );
}

/**
 * @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters | Danbooru Wiki | help:common url parameters}
 * @todo migrate this type to a {@linkcode Schema} for improved validation
 */
type CommonUrlParameters<Keys extends readonly string[]> = {
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-format | Danbooru Wiki | help:common url parameters} */
  readonly format?: "json"; // NOTE: currently only `"json"` is supported
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-limit | Danbooru Wiki | help:common url parameters} */
  readonly limit?: number;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-page | Danbooru Wiki | help:common url parameters} */
  readonly page?: number | `a${number}` | `b${number}`;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-search | Danbooru Wiki | help:common url parameters} */
  readonly search?: UrlParams.CoercibleRecord;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-only | Danbooru Wiki | help:common url parameters} */
  readonly only?: Keys;
};
