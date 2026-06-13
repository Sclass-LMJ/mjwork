#!/bin/sh
printf "const SUPABASE_URL  = '%s';\n" "$SB_URL"  > config.js
printf "const SUPABASE_ANON = '%s';\n" "$SB_ANON" >> config.js
echo "config.js generated:"
cat config.js
