#!/usr/bin/env bash
# Speak Strong installer
# Usage: curl -fsSL https://raw.githubusercontent.com/jvalentini/speak-strong/main/install.sh | bash
#
# Options (via environment variables):
#   SPEAK_STRONG_VERSION  - Specific version to install (default: latest)
#   SPEAK_STRONG_INSTALL  - Installation directory (default: ~/.local/bin)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="jvalentini/speak-strong"
BINARY_NAME="speak-strong"
INSTALL_DIR="${SPEAK_STRONG_INSTALL:-$HOME/.local/bin}"
VERSION="${SPEAK_STRONG_VERSION:-latest}"

# Logging functions
info() { echo -e "${BLUE}info${NC}: $*"; }
success() { echo -e "${GREEN}success${NC}: $*"; }
warn() { echo -e "${YELLOW}warning${NC}: $*"; }
error() { echo -e "${RED}error${NC}: $*" >&2; }
die() { error "$*"; exit 1; }

# Detect OS
detect_os() {
    local os
    os="$(uname -s)"
    case "$os" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "darwin" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) die "Unsupported operating system: $os" ;;
    esac
}

# Detect architecture
detect_arch() {
    local arch
    arch="$(uname -m)"
    case "$arch" in
        x86_64|amd64) echo "x64" ;;
        arm64|aarch64) echo "arm64" ;;
        *) die "Unsupported architecture: $arch" ;;
    esac
}

# Get the latest version from GitHub
get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep '"tag_name"' \
        | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [ -z "$version" ]; then
        die "Failed to fetch latest version from GitHub"
    fi
    echo "$version"
}

# Verify the version exists
verify_version() {
    local version="$1"
    local http_code
    http_code=$(curl -sL -o /dev/null -w "%{http_code}" \
        "https://api.github.com/repos/${REPO}/releases/tags/${version}")
    
    if [ "$http_code" != "200" ]; then
        die "Version ${version} not found. Check available releases at: https://github.com/${REPO}/releases"
    fi
}

# Download and install the binary
install_binary() {
    local os="$1"
    local arch="$2"
    local version="$3"
    
    # Construct download URL
    local ext=""
    [ "$os" = "windows" ] && ext=".exe"
    
    local filename="${BINARY_NAME}-${os}-${arch}${ext}"
    local download_url="https://github.com/${REPO}/releases/download/${version}/${filename}"
    
    info "Downloading ${BINARY_NAME} ${version} for ${os}/${arch}..."
    
    # Create temp directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf '$tmp_dir'" EXIT
    
    local tmp_file="${tmp_dir}/${filename}"
    
    # Download the binary
    local http_code
    http_code=$(curl -fsSL -o "$tmp_file" -w "%{http_code}" "$download_url" 2>/dev/null) || true
    
    if [ ! -f "$tmp_file" ] || [ ! -s "$tmp_file" ]; then
        die "Failed to download from: $download_url
        
Please check that binaries are available for your platform.
You can also install from source:
  git clone https://github.com/${REPO}.git
  cd speak-strong && bun install"
    fi
    
    # Create install directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"
    
    # Install the binary
    local install_path="${INSTALL_DIR}/${BINARY_NAME}${ext}"
    mv "$tmp_file" "$install_path"
    chmod +x "$install_path"
    
    success "Installed ${BINARY_NAME} to ${install_path}"
}

# Check if the install directory is in PATH
check_path() {
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        warn "$INSTALL_DIR is not in your PATH"
        echo ""
        echo "Add it to your shell configuration:"
        echo ""
        
        local shell_name
        shell_name=$(basename "$SHELL")
        
        case "$shell_name" in
            bash)
                echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
                echo "  source ~/.bashrc"
                ;;
            zsh)
                echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
                echo "  source ~/.zshrc"
                ;;
            fish)
                echo "  fish_add_path ~/.local/bin"
                ;;
            *)
                echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
                ;;
        esac
        echo ""
    fi
}

# Verify installation
verify_installation() {
    local install_path="${INSTALL_DIR}/${BINARY_NAME}"
    [ "$(detect_os)" = "windows" ] && install_path="${install_path}.exe"
    
    if [ -x "$install_path" ]; then
        success "Installation verified!"
        echo ""
        echo "Run '${BINARY_NAME} --help' to get started"
    else
        die "Installation failed - binary not found at ${install_path}"
    fi
}

# Main
main() {
    echo ""
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║       Speak Strong Installer          ║"
    echo "  ║  Transform weak language into strong  ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo ""
    
    # Detect platform
    local os arch
    os=$(detect_os)
    arch=$(detect_arch)
    info "Detected platform: ${os}/${arch}"
    
    # Get version
    if [ "$VERSION" = "latest" ]; then
        VERSION=$(get_latest_version)
        info "Latest version: ${VERSION}"
    else
        # Ensure version has 'v' prefix
        [[ "$VERSION" != v* ]] && VERSION="v${VERSION}"
        verify_version "$VERSION"
        info "Installing version: ${VERSION}"
    fi
    
    # Install
    install_binary "$os" "$arch" "$VERSION"
    
    # Post-install
    check_path
    verify_installation
}

main "$@"
