# What every example's Makefile includes: its web app and its two desktop shells. An example's
# Makefile sets PORT and includes this; from the repository root, `make <example>-<target>` runs
# the same target, e.g. `make tasks-tauri`.

.DEFAULT_GOAL := help
.PHONY: help check web dev electron tauri tauri-build

# One Cargo target folder for every example's Tauri shell, so Rust builds its crates once.
export CARGO_TARGET_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/.cargo-target)

help: ## List the targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-12s %s\n", $$1, $$2}'

check: ## Build the web app, bundle the Electron main file and cargo check the Tauri shell, as CI does
	cd web && bun install && bun run build
	cd electron && bun install && bun run build:main
	cd tauri && bun install && cd src-tauri && cargo check

web: ## Build the web app and serve it with vite preview
	cd web && bun install && bun run build && bunx vite preview --port $(PORT) --strictPort

dev: ## Run the web app's dev server
	cd web && bun install && bun run dev -- --port $(PORT)

electron: ## Build the web app and open it in Electron
	cd electron && bun install && bun run start

tauri: ## Build the web app and open it in Tauri
	cd tauri && bun install && bun run dev

tauri-build: ## Build the Tauri release binary, without installers
	cd tauri && bun install && bun run build
