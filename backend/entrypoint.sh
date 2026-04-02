#!/bin/sh
# Fix /data ownership after Railway volume mount (volume is mounted as root)
if [ -d /data ]; then
  chown -R appuser:appuser /data 2>/dev/null || true
fi
# Drop to appuser and exec the main process
exec gosu appuser "$@"
