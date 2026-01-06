# lsd (lusego database sync)

## getting started

1. copy `.env.example` to `.env` and update POSTGRES_PASSWORD

   ```shell
   cp .env.example .env
   ```

2. use "reopen in container" in your ide, or run:

   ```shell
   docker compose -f compose.yaml -f .devcontainer/compose.yaml up
   ```

   this starts postgres and [tap](https://docs.bsky.app/blog/introducing-tap), alongside [drizzle gateway](https://gateway.drizzle.team/) and the main app used by the devcontainer

# secure deployment

- use `compose.yaml` as the production definition
- set environment variables defined in `.env.example`
- do NOT expose postgres publicly, keep it on the internal network only
- persist the postgres-data volume

if upstream images require additional configuration, also set their environment
variables after consulting their docs
