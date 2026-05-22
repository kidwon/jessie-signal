#!/bin/bash
# Start Convex backend and Vite dev server in parallel
npx convex dev &
CONVEX_PID=$!
npm run dev &
VITE_PID=$!

trap "kill $CONVEX_PID $VITE_PID 2>/dev/null" EXIT
wait
