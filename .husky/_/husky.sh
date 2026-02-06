#!/bin/sh

if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky (debug) - $1"
  }

  readonly husky_skip_init=1
  export husky_skip_init
  debug "Reading .huskyrc and loading hooks"
  # Source user .huskyrc if present
  [ -f ~/.huskyrc ] && . ~/.huskyrc
fi
