#!/bin/bash
bunx eslint . --fix || true
npx vite build
