# lsd (lusego database sync)

a lightweight service for indexing and querying media posts

the goal is to build a searchable database of posts (initially from bluesky),
with data from external sources like danbooru, and expose it through an api

this is intended to be used by:

- bluesky feed generators
- custom frontends
- etc.

the project prioritizes:

- simplicity
- performance
- minimal dependencies

it uses sqlite for storage and runs locally or with docker compose

## getting started

```shell
docker compose up
```
