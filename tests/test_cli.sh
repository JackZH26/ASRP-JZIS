#!/usr/bin/env bash
# ASRP v0.1.0 — Full Test Suite

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0
TEST_DIR="/tmp/asrp-test-$$"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$SCRIPT_DIR/bin:$PATH"
export ASRP_ROOT="$TEST_DIR"

log_pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
log_fail() { echo -e "  ${RED}✗${NC} $1: $2"; FAIL=$((FAIL+1)); }

assert_contains() { echo "$1" | grep -q "$2" && log_pass "$3" || log_fail "$3" "expected '$2'"; }
assert_file() { [ -f "$1" ] && log_pass "$2" || log_fail "$2" "file missing: $1"; }
assert_dir() { [ -d "$1" ] && log_pass "$2" || log_fail "$2" "dir missing: $1"; }
assert_exec() { [ -x "$1" ] && log_pass "$2" || log_fail "$2" "not executable: $1"; }

echo "================================================"
echo " ASRP v0.1.0 Test Suite"
echo "================================================"

mkdir -p "$TEST_DIR"

# --- T1: Help ---
echo "--- T1: CLI Help ---"
OUT=$(asrp help 2>&1)
assert_contains "$OUT" "ASRP" "T1.1 banner"
assert_contains "$OUT" "init" "T1.2 init command"
assert_contains "$OUT" "register" "T1.3 register command"
assert_contains "$OUT" "doctor" "T1.4 doctor command"

# --- T2: Init ---
echo "--- T2: Init ---"
cd "$TEST_DIR"
asrp init . > /dev/null 2>&1
assert_dir "$TEST_DIR/workspace" "T2.1 workspace/"
assert_dir "$TEST_DIR/workspace/data" "T2.2 data/"
assert_dir "$TEST_DIR/workspace/registry" "T2.3 registry/"
assert_dir "$TEST_DIR/workspace/papers" "T2.4 papers/"
assert_dir "$TEST_DIR/workspace/audit" "T2.5 audit/"
assert_dir "$TEST_DIR/workspace/messages" "T2.6 messages/"
assert_dir "$TEST_DIR/workspace/logs" "T2.7 logs/"
assert_dir "$TEST_DIR/agents" "T2.8 agents/"
assert_file "$TEST_DIR/config.yaml" "T2.9 config.yaml"
assert_file "$TEST_DIR/.env" "T2.10 .env"
assert_file "$TEST_DIR/.gitignore" "T2.11 .gitignore"
assert_file "$TEST_DIR/workspace/audit/audit.jsonl" "T2.12 audit.jsonl"
# Verify gitignore content
grep -q "config.yaml" "$TEST_DIR/.gitignore" && log_pass "T2.13 gitignore has config.yaml" || log_fail "T2.13" "missing"
grep -q ".env" "$TEST_DIR/.gitignore" && log_pass "T2.14 gitignore has .env" || log_fail "T2.14" "missing"
# Verify audit JSON valid
python3 -c "import json; [json.loads(l) for l in open('$TEST_DIR/workspace/audit/audit.jsonl')]" 2>/dev/null \
  && log_pass "T2.15 audit JSON valid" || log_fail "T2.15" "invalid JSON"
# Idempotency
LINES_BEFORE=$(wc -l < "$TEST_DIR/workspace/audit/audit.jsonl")
asrp init . > /dev/null 2>&1
LINES_AFTER=$(wc -l < "$TEST_DIR/workspace/audit/audit.jsonl")
[ "$LINES_BEFORE" = "$LINES_AFTER" ] && log_pass "T2.16 re-init idempotent" || log_fail "T2.16" "audit duplicated"

# --- T3: Status (empty) ---
echo "--- T3: Status ---"
OUT=$(asrp status 2>&1)
assert_contains "$OUT" "Total registered: 0" "T3.1 zero experiments"
assert_contains "$OUT" "Audit log:" "T3.2 audit section"
assert_contains "$OUT" "Workspace size:" "T3.3 disk section"

# --- T4: Register + Status ---
echo "--- T4: Register ---"
cat > "$TEST_DIR/workspace/registry/EXP-TEST-001.json" << 'REG'
{"experiment_id":"EXP-TEST-001","status":"completed","outcome":"confirmed","hypothesis":"Test hypothesis","actual_result":"Test result","expected_result":"Expected","researcher":"test"}
REG
OUT=$(asrp status 2>&1)
assert_contains "$OUT" "Total registered: 1" "T4.1 counts 1"
assert_contains "$OUT" "Completed:.*1" "T4.2 completed 1"

# --- T5: Validate ---
echo "--- T5: Validate ---"
OUT=$(asrp validate EXP-TEST-001 2>&1)
assert_contains "$OUT" "Test hypothesis" "T5.1 shows hypothesis"
assert_contains "$OUT" "completed" "T5.2 shows status"
assert_contains "$OUT" "confirmed" "T5.3 shows outcome"
assert_contains "$OUT" "reproduced" "T5.4 checklist"
OUT2=$(asrp validate NONEXISTENT 2>&1 || true)
assert_contains "$OUT2" "not found" "T5.5 rejects unknown"

# --- T6: Audit ---
echo "--- T6: Audit ---"
echo '{"timestamp":"2026-04-02T10:00:00Z","agent":"test","type":"test","action":"test_action","details":"Test"}' >> "$TEST_DIR/workspace/audit/audit.jsonl"
OUT=$(asrp audit 2>&1)
assert_contains "$OUT" "test_action" "T6.1 shows entry"
assert_contains "$OUT" "workspace_created" "T6.2 shows init"
ERRS=$(python3 -c "import json; e=0
for l in open('$TEST_DIR/workspace/audit/audit.jsonl'):
 try: json.loads(l)
 except: e+=1
print(e)" 2>/dev/null)
[ "$ERRS" = "0" ] && log_pass "T6.3 all JSON valid" || log_fail "T6.3" "$ERRS errors"

# --- T7: Doctor ---
echo "--- T7: Doctor ---"
OUT=$(asrp doctor 2>&1)
assert_contains "$OUT" "Workspace directory exists" "T7.1 workspace check"
assert_contains "$OUT" "config.yaml" "T7.2 config check"
assert_contains "$OUT" "Audit log:" "T7.3 audit check"
assert_contains "$OUT" "Disk usage:" "T7.4 disk check"

# --- T8: Report ---
echo "--- T8: Report ---"
OUT=$(asrp report 2>&1)
assert_contains "$OUT" "Experiments registered: 1" "T8.1 experiment count"
assert_contains "$OUT" "EXP-TEST-001" "T8.2 experiment ID"

# --- T9: Security ---
echo "--- T9: Security ---"
KEYS=$(grep -rE "sk-ant-[a-zA-Z0-9]{20,}" "$SCRIPT_DIR" --include="*.md" --include="*.json" --include="*.yaml" --include="*.sh" 2>/dev/null | grep -v ".git/" | wc -l)
[ "$KEYS" = "0" ] && log_pass "T9.1 no hardcoded keys" || log_fail "T9.1" "found $KEYS"
grep -q "config.yaml" "$SCRIPT_DIR/.gitignore" && log_pass "T9.2 gitignore config" || log_fail "T9.2" "missing"
grep -q ".env" "$SCRIPT_DIR/.gitignore" && log_pass "T9.3 gitignore .env" || log_fail "T9.3" "missing"

# --- T10: Repo Structure ---
echo "--- T10: Structure ---"
assert_file "$SCRIPT_DIR/README.md" "T10.1 README.md"
assert_file "$SCRIPT_DIR/README.zh-CN.md" "T10.2 README.zh-CN.md"
assert_file "$SCRIPT_DIR/README.de.md" "T10.3 README.de.md"
assert_file "$SCRIPT_DIR/LICENSE" "T10.4 LICENSE"
for role in theorist engineer reviewer librarian itdoctor; do
  assert_file "$SCRIPT_DIR/agents/${role}-soul.md" "T10.5 ${role} SOUL"
  FJ="$SCRIPT_DIR/agents/skills/${role}.json"
  assert_file "$FJ" "T10.6 ${role} skills"
  python3 -c "import json; json.load(open('$FJ'))" 2>/dev/null \
    && log_pass "T10.7 ${role}.json valid" || log_fail "T10.7 ${role}.json" "invalid"
done
assert_exec "$SCRIPT_DIR/bin/asrp" "T10.8 asrp executable"
assert_exec "$SCRIPT_DIR/bin/asrp-doctor-daemon" "T10.9 daemon executable"
assert_exec "$SCRIPT_DIR/agents/skills/install.sh" "T10.10 install.sh executable"
assert_file "$SCRIPT_DIR/setup/index.html" "T10.11 setup wizard"
assert_file "$SCRIPT_DIR/docs/setup/index.html" "T10.12 setup (pages)"

# --- T11: Skills ---
echo "--- T11: Skills ---"
for role in theorist engineer reviewer librarian itdoctor; do
  HAS_DISCORD=$(python3 -c "
import json
d=json.load(open('$SCRIPT_DIR/agents/skills/${role}.json'))
print(any(s['name']=='discord' for s in d.get('skills',{}).get('openclaw',[])))" 2>/dev/null)
  [ "$HAS_DISCORD" = "False" ] && log_pass "T11.1 ${role} no discord" || log_fail "T11.1 ${role}" "has discord"
done

# --- T12: Docs ---
echo "--- T12: Docs ---"
assert_file "$SCRIPT_DIR/docs/architecture.md" "T12.1 architecture"
assert_file "$SCRIPT_DIR/docs/methodology.md" "T12.2 methodology"
assert_file "$SCRIPT_DIR/docs/quickstart.md" "T12.3 quickstart"

# --- T13: Examples ---
echo "--- T13: Examples ---"
assert_file "$SCRIPT_DIR/examples/dd-study/README.md" "T13.1 DD study"
assert_file "$SCRIPT_DIR/examples/dd-study/EXPERIMENT_REGISTRY.json" "T13.2 DD registry"
assert_file "$SCRIPT_DIR/examples/portfolio/README.md" "T13.3 portfolio"

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "================================================"
echo -e " RESULTS: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "================================================"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
