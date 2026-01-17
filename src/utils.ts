import type { Schema, ParseResult } from "effect";
import pkg from "../package.json" with { type: "json" };

export const USER_AGENT = `${pkg.name}/${pkg.version} (${pkg.repository.url})`;

/**
 * utilizes the constructor of any {@linkcode Schema.Class} to synchronously validate props automatically
 * @throws a {@linkcode ParseResult.ParseError} if validation is enabled (default) and props fail validation
 * @see {@link https://effect.website/docs/schema/classes/#validating-properties-via-class-constructors | Effect Documentation | Schema | Class APIs | Validating Properties via Class Constructors}
 */
export const unsafeSchemaMake =
  <Self>(
    Self: new (props: any, options?: Schema.MakeOptions) => Self,
    options?: Schema.MakeOptions,
  ) =>
  (props: unknown) =>
    props instanceof Self ? props : new Self(props as any, options);
