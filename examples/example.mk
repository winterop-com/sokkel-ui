# What every example's Makefile includes: its web app and its two desktop shells. An example's
# Makefile sets PORT and includes this; from the repository root, `make <example>-<target>` runs
# the same target, e.g. `make tasks-tauri`.

.DEFAULT_GOAL := help
.PHONY: help packages check web dev electron tauri tauri-build

EXAMPLES_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

# One Cargo target folder for every example's Tauri shell, so Rust builds its crates once.
export CARGO_TARGET_DIR := $(EXAMPLES_DIR)/.cargo-target

help: ## List the targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-12s %s\n", $$1, $$2}'

# Builds the packages and drops the web app's copy of them, so its next install copies the packages
# as they are now. The root Makefile sets PACKAGES_BUILT when it has built them already.
packages:
ifndef PACKAGES_BUILT
	$(MAKE) -C $(EXAMPLES_DIR)/.. build
endif
	rm -rf web/node_modules/@winterop-com

check: packages ## Build the web app, bundle the Electron main file and cargo check the Tauri shell, as CI does
	cd web && bun install && bun run build
	cd electron && bun install && bun run build:main
	cd tauri && bun install && cd src-tauri && cargo check

web: packages ## Build the web app and serve it with vite preview
	cd web && bun install && bun run build && bun run preview -- --port $(PORT) --strictPort

dev: packages ## Run the web app's dev server
	cd web && bun install && bun run dev -- --port $(PORT)

electron: packages ## Build the web app and open it in Electron
	cd electron && bun install && bun run start

tauri: packages ## Build the web app and open it in Tauri
	cd tauri && bun install && bun run dev

tauri-build: packages ## Build the Tauri release binary, without installers
	cd tauri && bun install && bun run build
