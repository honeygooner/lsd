import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Function, Schedule, Schema } from "effect";
import { unsafeSchemaMake } from "./utils.ts";

/** @see {@link https://atproto.com/specs/xrpc#error-responses | AT Protocol | HTTP API (XRPC) | Error Responses} */
export class XrpcError extends Schema.TaggedError<XrpcError>()("XrpcError", {
  error: Schema.String,
  message: Schema.optional(Schema.String),
}) {}

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
        HttpClient.catchTag("ResponseError", (responseError) =>
          Effect.flatMap(responseError.response.json, unsafeSchemaMake(XrpcError)),
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
    XrpcClient.use((client) =>
      Function.pipe(
        params,
        Schema.validate(def.Params),
        Effect.flatMap((urlParams) => client.get(`/xrpc/${def.id}`, { urlParams })),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(def.Output)),
      ),
    );
}
