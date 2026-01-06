import { NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

const program = Effect.log("hello effect");

NodeRuntime.runMain(program, { disablePrettyLogger: true });