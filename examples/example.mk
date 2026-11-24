# What every example's Makefile includes: its web app and its two desktop shells. An example's
# Makefile sets PORT and includes this; from the repository root, `make <example>-<target>` runs
# the same target, e.g. `make tasks-tauri`.

.DEFAULT_GOAL := help
.PHONY: help packages web-install web-dist check web dev electron tauri tauri-build tauri-app

EXAMPLES_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
PACKAGES_STAMP := $(EXAMPLES_DIR)/../node_modules/.cache/sokkel-ui/packages.stamp
# Left by web-install when the web app's copy of the packages is taken.
COPY_STAMP := web/node_modules/.sokkel-ui-copy

# One Cargo target folder for every example's Tauri shell, in every checkout and worktree, so Rust
# builds its crates once. CI sets its own.
CARGO_TARGET_DIR ?= $(or $(XDG_CACHE_HOME),$(HOME)/.cache)/sokkel-ui/examples-cargo-target
export CARGO_TARGET_DIR

# The shells run the web build here, so the build command in tauri.conf.json is dropped.
TAURI_DEV_CONFIG := '{"build":{"beforeDevCommand":null}}'
TAURI_BUILD_CONFIG := '{"build":{"beforeBuildCommand":null}}'
TAURI_APP_CONFIG := '{"build":{"beforeBuildCommand":null},"bundle":{"active":true}}'

# Where tauri-app leaves the app: dist/apps/ at the repository root.
APPS_DIR := $(abspath $(EXAMPLES_DIR)/../dist/apps)
CRATE := $(shell awk -F'"' '/^name/ { print $$2; exit }' tauri/src-tauri/Cargo.toml)
PRODUCT := $(shell awk -F'"' '/"productName"/ { print $$4; exit }' tauri/src-tauri/tauri.conf.json)

help: ## List the targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-12s %s\n", $$1, $$2}'

# Builds the packages when their sources changed since the last build. The root Makefile sets
# PACKAGES_BUILT when it has seen to them already.
packages:
ifndef PACKAGES_BUILT
	@$(MAKE) --no-print-directory -C $(EXAMPLES_DIR)/.. packages
endif

# Installs the web app, taking a fresh copy of the packages when they were built after the last copy.
web-install: packages
	@if [ ! -f $(COPY_STAMP) ] || [ $(PACKAGES_STAMP) -nt $(COPY_STAMP) ]; then \
		rm -rf web/node_modules/@winterop-com && (cd web && bun install) && touch $(COPY_STAMP); \
	else \
		cd web && bun install; \
	fi

# Builds the web app when a file of its own, of examples/shared or its copy of the packages is newer
# than its last build.
web-dist: web-install
	@if [ ! -f web/dist/index.html ] || [ -n "$$(find web $(EXAMPLES_DIR)/shared $(COPY_STAMP) \( -name node_modules -o -name dist \) -prune -o -type f -newer web/dist/index.html -print | head -n 1)" ]; then \
		cd web && bun run build; \
	else \
		echo "The web app is up to date."; \
	fi

check: web-install ## Build the web app, bundle the Electron main file and cargo check the Tauri shell, as CI does
	cd web && bun run build
	cd electron && bun install && bun run build:main
	cd tauri && bun install && cd src-tauri && cargo check

web: web-dist ## Build the web app and serve it with vite preview
	cd web && bun run preview -- --port $(PORT) --strictPort

dev: web-install ## Run the web app's dev server
	cd web && bun run dev -- --port $(PORT)

electron: web-dist ## Build the web app and open it in Electron
	cd electron && bun install && bun run build:main && bun --bun electron .

tauri: web-dist ## Build the web app and open it in Tauri
	cd tauri && bun install && bun run dev --config $(TAURI_DEV_CONFIG)

tauri-build: web-dist ## Build the Tauri release binary, without installers
	cd tauri && bun install && bun run build --config $(TAURI_BUILD_CONFIG)

tauri-app: web-dist ## Build the Tauri app into dist/apps/: a .app bundle on macOS, the binary elsewhere
	@mkdir -p $(APPS_DIR)
ifeq ($(shell uname),Darwin)
	cd tauri && bun install && bun run build --config $(TAURI_APP_CONFIG) --bundles app
	rsync -a --delete "$(CARGO_TARGET_DIR)/release/bundle/macos/$(PRODUCT).app/" "$(APPS_DIR)/$(PRODUCT).app/"
	@echo "$(APPS_DIR)/$(PRODUCT).app"
else
	cd tauri && bun install && bun run build --config $(TAURI_BUILD_CONFIG)
	cp "$(CARGO_TARGET_DIR)/release/$(CRATE)" "$(APPS_DIR)/"
	@echo "$(APPS_DIR)/$(CRATE)"
endif
