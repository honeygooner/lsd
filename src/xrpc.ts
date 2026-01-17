import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Function, Schedule, Schema } from "effect";

/** @see {@link https://atproto.com/specs/xrpc#error-responses | AT Protocol | HTTP API (XRPC) | Error Responses} */
export class XrpcError extends Schema.TaggedError<XrpcError>()("XrpcError", {
  error: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly Response = Function.pipe(Schema.encodedBoundSchema(this), Schema.omit("_tag"));
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
        HttpClient.catchTag("ResponseError", (responseError) =>
          Function.pipe(
            responseError.response.json,
            Effect.flatMap(Schema.decodeUnknown(XrpcError.Response)),
            Effect.flatMap((props) => new XrpcError(props, { disableValidation: true })),
          ),
        ),
      ),
    ),
}) {}

export function makeQuery<Params, Input extends UrlParams.Input, Output>(def: {
  id: string;
  Params: Schema.Schema<Params, Input>;
  Output: Schema.Schema<Output, any>;
}) {
  return (params: Params) =>
    XrpcClient.use((client) =>
      Function.pipe(
        params,
        Schema.validate(Schema.encodedBoundSchema(def.Params)),
        Effect.flatMap((urlParams) => client.get(`/xrpc/${def.id}`, { urlParams })),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(def.Output)),
      ),
    );
}
