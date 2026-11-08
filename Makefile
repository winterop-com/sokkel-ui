# The common commands, as `make <target>`. Everything runs through bun; `make help` lists them.

.DEFAULT_GOAL := help
.PHONY: help install tokens storybook build size typecheck lint fmt fmt-check test check storybook-build baselines visual visual-update screenshots-ci layout examples examples-list clean

help: ## List the targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-16s %s\n", $$1, $$2}'

install: ## Install the dependencies
	bun install

tokens: ## Build tokens.css and the theme files from tokens/tokens.json
	bun run tokens

storybook: ## Run the Storybook dev server on port 6106
	bun run storybook

build: ## Build every package into its dist/
	bun run build

size: build ## Build the size apps against the packages and hold each to its budget
	bun run size

typecheck: ## Check the types
	bun run typecheck

lint: ## Lint
	bun run lint

fmt: ## Format every file
	bun run fmt

fmt-check: ## Check the formatting
	bun run fmt:check

test: ## Run the unit tests and the library rules
	bun run test

check: typecheck lint fmt-check test ## The fast gates to run before pushing

storybook-build: ## Build the static Storybook into storybook-static/
	bun run build-storybook

baselines: ## Write the current branch's screenshot baselines into e2e/__screenshots__ from their branch
	scripts/baselines.sh checkout

visual: ## Compare every story with its screenshot, in the Linux image as CI does
	bun run test:visual:linux

visual-update: ## Retake the screenshots, in the Linux image as CI does
	bun run test:visual:linux:update

screenshots-ci: ## Retake the screenshots on GitHub into the current branch's baselines branch (STORIES='pattern' for some)
	gh workflow run screenshots.yaml --ref $$(git branch --show-current) -f stories='$(STORIES)'

layout: storybook-build ## Check that no story scrolls sideways at the narrow widths
	bunx playwright test e2e/layout.spec.ts

# Every folder in examples/ with a Makefile is an example: a web app and its Electron and Tauri shells.
EXAMPLES := $(sort $(patsubst examples/%/Makefile,%,$(wildcard examples/*/Makefile)))
EXAMPLE_TARGETS := web dev electron tauri tauri-build

examples: build ## Build every example's web app and check its desktop shells, as CI does
	@for name in $(EXAMPLES); do $(MAKE) -C examples/$$name check || exit 1; done

examples-list: ## List the examples and what make runs for each, e.g. make tasks-tauri
	@for name in $(EXAMPLES); do printf '  %-10s make %s-{%s}\n' $$name $$name "$$(echo $(EXAMPLE_TARGETS) | tr ' ' ,)"; done

# make <example>-<target>, e.g. make tasks-web or make runs-tauri-build, after building the packages.
$(foreach target,$(EXAMPLE_TARGETS),$(addsuffix -$(target),$(EXAMPLES))): build
	$(MAKE) -C examples/$(firstword $(subst -, ,$@)) $(patsubst $(firstword $(subst -, ,$@))-%,%,$@)

clean: ## Remove what the builds made
	rm -rf packages/*/dist storybook-static test-results
