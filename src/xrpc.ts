import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Data, Effect, Function, Schedule, Schema } from "effect";

export class XrpcError extends Data.TaggedError("XrpcError") {
  constructor(fields: typeof XrpcError.ResponseSchema.Type) {
    super();
    this.name = fields.error;
    this.message = fields.message || super.message;
  }

  /** @see {@link https://atproto.com/specs/xrpc#error-responses | AT Protocol | HTTP API (XRPC) | Error Responses} */
  static readonly ResponseSchema = Schema.Struct({
    error: Schema.String,
    message: Schema.optional(Schema.String),
  });
}

export class XrpcClient extends Effect.Service<XrpcClient>()("XrpcClient", {
  dependencies: [NodeHttpClient.layer],
  effect: (serviceUrl: string) =>
    Effect.map(HttpClient.HttpClient, (httpClient) =>
      Function.pipe(
        httpClient,
        HttpClient.mapRequest(HttpClientRequest.prependUrl(serviceUrl)),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential("125 millis"),
          times: 5,
        }),
        HttpClient.catchTag("ResponseError", (error) =>
          Function.pipe(
            error.response.json,
            Effect.flatMap(Schema.decodeUnknown(XrpcError.ResponseSchema)),
            Effect.flatMap((fields) => new XrpcError(fields)),
          ),
        ),
      ),
    ),
}) {}

export function makeQuery<Params extends UrlParams.Input, Output>(def: {
  id: string;
  Params: Schema.Schema<Params, any>;
  Output: Schema.Schema<Output, any>;
}) {
  return (params: Params) =>
    Effect.flatMap(XrpcClient, (client) =>
      Function.pipe(
        params,
        Schema.validate(def.Params),
        Effect.flatMap((urlParams) => client.get(`/xrpc/${def.id}`, { urlParams })),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(def.Output)),
      ),
    );
}
