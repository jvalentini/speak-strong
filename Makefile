# ============================================
# Makefile for Speak Strong CLI
# Transform weak language into confident communication
# ============================================

# ============================================
# Configuration Variables
# ============================================

VERSION := $(shell node -p "require('./package.json').version")
BUILD_DATE := $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# ============================================
# Default Target
# ============================================
.DEFAULT_GOAL := help

# ============================================
# Help / Usage
# ============================================
.PHONY: help
help:
	@echo "=========================================="
	@echo "Speak Strong CLI - Commands"
	@echo "=========================================="
	@echo ""
	@echo "SETUP:"
	@echo "  make install        - Install dependencies with bun"
	@echo ""
	@echo "DEVELOPMENT:"
	@echo "  make dev            - Run CLI in development mode"
	@echo "  make lint           - Run biome linter"
	@echo "  make lint-fix       - Run biome linter with auto-fix"
	@echo "  make format         - Format code with biome"
	@echo "  make oxlint         - Run oxlint"
	@echo "  make check          - Run all checks (typecheck + lint + oxlint)"
	@echo "  make typecheck      - Run TypeScript type checking"
	@echo ""
	@echo "TESTING:"
	@echo "  make test           - Run all tests"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo ""
	@echo "RELEASE:"
	@echo "  make bump-patch     - Bump patch version (0.1.0 -> 0.1.1)"
	@echo "  make bump-minor     - Bump minor version (0.1.0 -> 0.2.0)"
	@echo "  make bump-major     - Bump major version (0.1.0 -> 1.0.0)"
	@echo "  make release        - Create GitHub release for current version"
	@echo "  make release-patch  - Bump patch + create release"
	@echo "  make release-minor  - Bump minor + create release"
	@echo "  make release-major  - Bump major + create release"
	@echo ""
	@echo "CLEANUP:"
	@echo "  make clean          - Remove node_modules and build artifacts"
	@echo ""
	@echo "UTILITIES:"
	@echo "  make version        - Show version information"
	@echo "  make status         - Show git status"

# ============================================
# Setup Commands
# ============================================

.PHONY: install
install:
	@echo "Installing dependencies with bun..."
	@bun install
	@echo "Dependencies installed!"

# ============================================
# Development Commands
# ============================================

.PHONY: dev
dev:
	@bun run speak-strong.ts --help

.PHONY: lint
lint:
	@echo "Running biome linter..."
	@bun run lint

.PHONY: lint-fix
lint-fix:
	@echo "Running biome linter with auto-fix..."
	@bun run lint:fix

.PHONY: format
format:
	@echo "Formatting code with biome..."
	@bun run format

.PHONY: oxlint
oxlint:
	@echo "Running oxlint..."
	@bun run oxlint

.PHONY: typecheck
typecheck:
	@echo "Running TypeScript type checking..."
	@bunx tsc --noEmit

.PHONY: check
check: typecheck lint oxlint
	@echo "All checks complete!"

# ============================================
# Test Commands
# ============================================

.PHONY: test
test:
	@echo "=========================================="
	@echo "Running Speak Strong Tests"
	@echo "=========================================="
	@bun test
	@echo ""
	@echo "Tests complete!"

.PHONY: test-watch
test-watch:
	@echo "Starting tests in watch mode..."
	@bun test --watch

# ============================================
# Version Bump Commands
# ============================================

.PHONY: bump-patch
bump-patch:
	@echo "Bumping patch version..."
	@npm version patch --no-git-tag-version
	@NEW_VERSION=$$(node -p "require('./package.json').version"); \
	git add package.json; \
	git commit -m "chore: bump version to v$$NEW_VERSION"; \
	echo "Version bumped to $$NEW_VERSION"

.PHONY: bump-minor
bump-minor:
	@echo "Bumping minor version..."
	@npm version minor --no-git-tag-version
	@NEW_VERSION=$$(node -p "require('./package.json').version"); \
	git add package.json; \
	git commit -m "chore: bump version to v$$NEW_VERSION"; \
	echo "Version bumped to $$NEW_VERSION"

.PHONY: bump-major
bump-major:
	@echo "Bumping major version..."
	@npm version major --no-git-tag-version
	@NEW_VERSION=$$(node -p "require('./package.json').version"); \
	git add package.json; \
	git commit -m "chore: bump version to v$$NEW_VERSION"; \
	echo "Version bumped to $$NEW_VERSION"

# ============================================
# Release Commands
# ============================================

# Check if we're on main branch before allowing releases
.PHONY: check-main-branch
check-main-branch:
	@CURRENT_BRANCH=$$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD); \
	if [ "$$CURRENT_BRANCH" != "main" ]; then \
		echo "Error: Releases can only be created on the main branch."; \
		echo "Current branch: $$CURRENT_BRANCH"; \
		echo "Please switch to main branch first: git checkout main"; \
		exit 1; \
	fi

.PHONY: release
release: check-main-branch
	@echo "Creating GitHub release for v$(VERSION)..."
	@git tag -a "v$(VERSION)" -m "Release v$(VERSION)" 2>/dev/null || echo "Tag v$(VERSION) already exists"
	@git push origin "v$(VERSION)" 2>/dev/null || echo "Tag already pushed"
	@gh release create "v$(VERSION)" \
		--title "v$(VERSION)" \
		--generate-notes \
		--latest
	@echo "Release v$(VERSION) created!"

.PHONY: release-patch
release-patch: check-main-branch bump-patch
	@git push
	@$(MAKE) release

.PHONY: release-minor
release-minor: check-main-branch bump-minor
	@git push
	@$(MAKE) release

.PHONY: release-major
release-major: check-main-branch bump-major
	@git push
	@$(MAKE) release

# ============================================
# Cleanup Commands
# ============================================

.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf node_modules
	@rm -rf dist
	@rm -f bun.lockb
	@echo "Clean complete!"

# ============================================
# Utility Commands
# ============================================

.PHONY: version
version:
	@echo "Speak Strong CLI"
	@echo "Version: $(VERSION)"
	@echo "Build Date: $(BUILD_DATE)"
	@echo "VCS Ref: $(VCS_REF)"

.PHONY: status
status:
	@echo "Git status:"
	@git status --short || echo "Not a git repository"
