#!/usr/bin/env bash
set -euo pipefail

for time_in_msec in $(seq 1000 100 2000); do
  python3 animate.py "${time_in_msec}"
done
