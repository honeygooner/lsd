import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Chunk, Data, Effect, Function, Option, RateLimiter, Schema, Stream } from "effect";
import { USER_AGENT } from "./util.ts";

class DanbooruError extends Data.TaggedError("DanbooruError")<typeof ResponseError.Type> {}

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
                    Effect.flatMap(response.json, Schema.decodeUnknown(ResponseError)),
                    Effect.flatMap((fields) => new DanbooruError(fields)),
                  ),
              }),
            ),
          ),
        ),
      ),
    ),
}) {}

const PaginationItem = Schema.Struct({
  id: Schema.extend(Schema.Positive, Schema.Int),
});

const ResponseError = Schema.Struct({
  success: Schema.Literal(false),
  error: Schema.String,
  message: Schema.String,
  backtrace: Schema.NullOr(Schema.Array(Schema.String)),
});

const ArtistUrl = Schema.Struct({
  id: Schema.extend(Schema.Positive, Schema.Int),
  artist_id: Schema.extend(Schema.Positive, Schema.Int),
  url: Schema.URL,
  created_at: Schema.Date,
  updated_at: Schema.Date,
  is_active: Schema.Boolean,
});

export const makeLayer = Danbooru.Default.bind(Danbooru);

export const getArtistUrls = getItems(HttpClientRequest.get("/artist_urls.json"), ArtistUrl);
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

    // TODO: simplify this section for ease of maintenance
    // this typescript wizardry is just to improve hover tooltips
    // the following code works as well:
    // const newSchema = keys ? schema.pipe(Schema.pick(...keys)) : schema;
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

function getItemsStream<Keys extends readonly string[], Item, E, R>(
  getItems: (urlParams?: CommonUrlParameters<Keys>) => Effect.Effect<readonly Item[], E, R>,
) {
  return (urlParams?: CommonUrlParameters<Keys>) =>
    Stream.paginateChunkEffect(undefined as CommonUrlParameters<Keys>["page"], (page) =>
      Effect.flatMap(getItems({ ...urlParams, page }), (items) =>
        Function.pipe(
          Option.fromNullable(items.at(-1)),
          Option.map(Schema.decodeUnknown(PaginationItem)),
          Effect.transposeOption,
          Effect.map((item) => [
            Chunk.fromIterable(items),
            Option.map(item, ({ id }) => `b${id}` as const),
          ]),
        ),
      ),
    );
}

/**
 * @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters | Danbooru Wiki | help:common url parameters}
 * @todo migrate this type to a {@linkcode Schema} for improved validation
 */
type CommonUrlParameters<Keys extends readonly string[]> = {
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-limit | Danbooru Wiki | help:common url parameters} */
  readonly limit?: number;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-page | Danbooru Wiki | help:common url parameters} */
  readonly page?: number | `a${number}` | `b${number}`;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-search | Danbooru Wiki | help:common url parameters} */
  readonly search?: UrlParams.CoercibleRecord;
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters#dtext-only | Danbooru Wiki | help:common url parameters} */
  readonly only?: Keys;
};
