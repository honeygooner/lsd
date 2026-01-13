// for embeds we don't care about

import { Schema } from "effect";

export const id = "app.bsky.embed.*";

export class Main extends Schema.Unknown.pipe(Schema.brand(id)) {}
