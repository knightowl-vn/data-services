# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository (`knightowl-vn/data-services`, branch scaffolding under way as "mandarin") is currently empty of application code. The only committed file besides this one is a placeholder GitHub Actions workflow at `.github/workflows/blank.yml` (runs on `ubuntu-24.04-arm`, triggers on push/PR to `main`).

`.github/workflows/claude.yml` runs Claude Code in CI, inside the Bash sandbox: issues labeled `claude` or mentioning `@claude` become PRs, and "Request changes" reviews on `claude/*` PRs get fixed automatically. See `docs/claude-automation.md`. When running there, network access is limited to GitHub and package registries, and `.git/config` is read-only (don't use `git push -u`).

There is no build system, package manifest, test suite, or source directory yet — do not assume a language, framework, or command exists until it's added. Update this file with real build/lint/test commands and an architecture overview once code lands.
