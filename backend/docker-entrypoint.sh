#!/bin/sh
set -eu
./node_modules/.bin/prisma migrate deploy
if [ "${SEED_CONTENT_ON_START:-true}" = "true" ]; then
  node dist-seed/seed.js
fi
exec node dist/index.js
