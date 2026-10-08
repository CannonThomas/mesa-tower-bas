#!/bin/sh
# Assemble the page from src/parts. src/page.html is the bare page; index.html wraps it as a standalone document.
set -e
cd "$(dirname "$0")"
cat src/parts/1-head.html src/parts/2-sim.html src/parts/3-ui.html > src/page.html
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  awk '/^<div class="wrap">$/{exit}{print}' src/page.html
  printf '</head>\n<body style="margin:0">\n'
  awk '/^<div class="wrap">$/{f=1}f' src/page.html
  printf '</body>\n</html>\n'
} > index.html
