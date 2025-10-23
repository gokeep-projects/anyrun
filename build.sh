#!/usr/bin/env bash
# Build script for Unix (bash)
# Usage: ./build.sh linux/amd64 darwin/arm64
OUTDIR=dist
mkdir -p "$OUTDIR"
for TARGET in "$@"; do
  IFS="/" read -r GOOS GOARCH <<< "$TARGET"
  EXT=""
  if [ "$GOOS" = "windows" ]; then
    EXT=.exe
  fi
  NAME="anyrun-$GOOS-$GOARCH$EXT"
  echo "Building $NAME..."
  GOOS=$GOOS GOARCH=$GOARCH go build -ldflags "-s -w" -o "$OUTDIR/$NAME" .
  if [ $? -ne 0 ]; then
    echo "Build failed for $TARGET"
    exit 1
  fi
done

echo "Builds placed in $OUTDIR"