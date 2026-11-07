# The common commands, as `make <target>`. Everything runs through bun; `make help` lists them.

.DEFAULT_GOAL := help
.PHONY: help install tokens storybook build size typecheck lint fmt fmt-check test check storybook-build visual visual-update screenshots-ci layout clean

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

visual: ## Compare every story with its screenshot, in the Linux image as CI does
	bun run test:visual:linux

visual-update: ## Retake the screenshots, in the Linux image as CI does
	bun run test:visual:linux:update

screenshots-ci: ## Retake the screenshots on GitHub for the current branch (STORIES='pattern' for some) and commit them there
	gh workflow run screenshots.yaml --ref $$(git branch --show-current) -f stories='$(STORIES)'

layout: storybook-build ## Check that no story scrolls sideways at the narrow widths
	bunx playwright test e2e/layout.spec.ts

clean: ## Remove what the builds made
	rm -rf packages/*/dist storybook-static test-results
