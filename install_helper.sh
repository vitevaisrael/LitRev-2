#!/bin/bash
# Smart install function based on Codex's recommendations

smart_install() {
    local target="${1:-all}"
    local skip_scripts="${2:-false}"
    
    echo "🔧 Smart install for: $target"
    
    # Check if we're in a constrained environment
    if [ -n "$CI" ] || [ -n "$CURSOR_SESSION" ] || [ -n "$SANDBOX" ]; then
        echo "📦 Detected constrained environment, using safe install mode"
        skip_scripts=true
    fi
    
    # Build install command
    local cmd="pnpm"
    
    if [ "$target" = "web" ]; then
        cmd="$cmd -F @the-scientist/web"
    elif [ "$target" = "server" ]; then
        cmd="$cmd -F @the-scientist/server"
    elif [ "$target" = "all" ]; then
        cmd="$cmd -r"
    fi
    
    cmd="$cmd install"
    
    if [ "$skip_scripts" = "true" ]; then
        echo "⏭️  Skipping install scripts (preinstall hooks)"
        cmd="npm_config_ignore_scripts=true $cmd"
    fi
    
    echo "🚀 Running: $cmd"
    eval "$cmd"
}

# Export for use in other scripts
export -f smart_install
