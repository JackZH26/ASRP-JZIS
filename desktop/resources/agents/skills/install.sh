#!/usr/bin/env bash
# ASRP Agent Skill Installer
# Usage: ./install.sh <role|all>
# Reads skill manifests and installs required packages

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

install_role() {
    local role="$1"
    local manifest="$SCRIPT_DIR/${role}.json"
    
    if [ ! -f "$manifest" ]; then
        echo -e "${RED}No manifest found for role: ${role}${NC}"
        return 1
    fi
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Installing skills for: ${role}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Python packages
    echo -e "\n${GREEN}[Python packages]${NC}"
    local py_packages=$(python3 -c "
import json
with open('$manifest') as f:
    data = json.load(f)
for pkg in data.get('skills', {}).get('python', []):
    if pkg.get('required', False):
        print(pkg['name'])
" 2>/dev/null)
    
    if [ -n "$py_packages" ]; then
        echo "$py_packages" | while read pkg; do
            echo -e "  → ${pkg}"
            pip install -q "$pkg" 2>/dev/null || echo -e "    ${YELLOW}⚠ Failed to install ${pkg}${NC}"
        done
    fi
    
    # ClawHub skills
    echo -e "\n${GREEN}[ClawHub skills]${NC}"
    local ch_skills=$(python3 -c "
import json
with open('$manifest') as f:
    data = json.load(f)
for skill in data.get('skills', {}).get('clawhub', []):
    if skill.get('required', False):
        print(skill['name'])
" 2>/dev/null)
    
    if [ -n "$ch_skills" ]; then
        echo "$ch_skills" | while read skill; do
            echo -e "  → ${skill}"
            clawhub install "$skill" 2>/dev/null || echo -e "    ${YELLOW}⚠ Failed to install ${skill} (may need manual install)${NC}"
        done
    else
        echo "  (none required)"
    fi
    
    # System tools (check only, don't auto-install)
    echo -e "\n${GREEN}[System tools — checking]${NC}"
    local sys_tools=$(python3 -c "
import json
with open('$manifest') as f:
    data = json.load(f)
for tool in data.get('skills', {}).get('system', []):
    if tool.get('required', False):
        print(tool['name'])
" 2>/dev/null)
    
    if [ -n "$sys_tools" ]; then
        echo "$sys_tools" | while read tool; do
            if command -v "$tool" &>/dev/null; then
                echo -e "  ${GREEN}✓${NC} ${tool}"
            else
                echo -e "  ${RED}✗${NC} ${tool} — install manually"
            fi
        done
    fi
    
    echo -e "\n${GREEN}✅ ${role} skill installation complete${NC}\n"
}

# Main
role="${1:-help}"

case "$role" in
    theorist|engineer|reviewer|librarian|itdoctor)
        install_role "$role"
        ;;
    all)
        for r in theorist engineer reviewer librarian itdoctor; do
            install_role "$r"
        done
        ;;
    help|--help|-h)
        echo "ASRP Agent Skill Installer"
        echo ""
        echo "Usage: $0 <role|all>"
        echo ""
        echo "Roles: theorist, engineer, reviewer, librarian, itdoctor, all"
        echo ""
        echo "Reads skill manifests (*.json) and installs:"
        echo "  - Python packages (pip)"
        echo "  - ClawHub skills (clawhub install)"
        echo "  - System tools (check only, manual install)"
        ;;
    *)
        echo "Unknown role: $role"
        echo "Available: theorist, engineer, reviewer, librarian, itdoctor, all"
        exit 1
        ;;
esac
