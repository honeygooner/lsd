import { HttpClient, HttpClientRequest, UrlParams } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Function, Schedule, Schema } from "effect";

/** @see {@link https://atproto.com/specs/xrpc#error-responses | AT Protocol | HTTP API (XRPC) | Error Responses} */
export class XrpcError extends Schema.Class<XrpcError>("XrpcError")({
  error: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  readonly _tag = "XrpcError";
}

export class XrpcClient extends Effect.Service<XrpcClient>()("XrpcClient", {
  dependencies: [NodeHttpClient.layer],
  effect: (serviceUrl: string) =>
    Effect.map(HttpClient.HttpClient, (httpClient) =>
      Function.pipe(
        httpClient,
        HttpClient.mapRequest(HttpClientRequest.prependUrl(serviceUrl)),
        HttpClient.filterStatusOk,
        HttpClient.catchTag("ResponseError", (responseError) =>
          responseError.reason !== "StatusCode"
            ? Effect.fail(responseError)
            : Function.pipe(
                responseError.response.json,
                Effect.flatMap(Schema.decodeUnknown(XrpcError)),
                Effect.flatMap((xrpcError) => Effect.fail(xrpcError)),
              ),
        ),
        HttpClient.retryTransient({
          schedule: Schedule.jittered(Schedule.exponential("125 millis")),
          times: 5,
        }),
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
        Schema.encode(def.Params),
        Effect.flatMap((urlParams) => client.get(`/xrpc/${def.id}`, { urlParams })),
        Effect.flatMap((response) => response.json),
        Effect.flatMap(Schema.decodeUnknown(def.Output)),
      ),
    );
}
