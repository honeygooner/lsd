import { Option } from "effect";

export function getIdentifierFromProfileUrl(url: string | URL) {
  const group = "identifier";
  const pattern = new URLPattern(`https://bsky.app/profile/:${group}`);
  return Option.fromNullable(pattern.exec(String(url))?.pathname.groups[group]);
}
