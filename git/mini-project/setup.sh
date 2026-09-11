#!/usr/bin/env bash
# Builds a small, real git history with a bug quietly introduced partway
# through, and a zero-dependency test that fails once the bug is present.
# This is the setup for `git bisect` (see README) - one of git's most
# powerful, most underused features: automatically binary-searching commit
# history to find the EXACT commit that broke something, instead of
# guessing or reading a diff by eye.
#
# Run: bash setup.sh
# (safe to re-run - it wipes and recreates demo-repo/ each time)

set -e

rm -rf demo-repo
mkdir demo-repo
cd demo-repo
git init -q
git config user.email "demo@example.com"
git config user.name "Demo"

cat > calc.py <<'EOF'
def add(a, b):
    return a + b
EOF
cat > test_calc.py <<'EOF'
from calc import add

assert add(2, 3) == 5, "add(2, 3) should be 5"
assert add(-1, 1) == 0, "add(-1, 1) should be 0"
assert add(0, 0) == 0, "add(0, 0) should be 0"
print("All tests passed.")
EOF
git add -A
git commit -q -m "Initial commit: add()"

cat >> calc.py <<'EOF'

def subtract(a, b):
    return a - b
EOF
git commit -q -am "Add subtract()"

cat >> calc.py <<'EOF'

def multiply(a, b):
    return a * b
EOF
git commit -q -am "Add multiply()"

sed -i.bak 's/def add(a, b):/def add(a, b):\n    """Add two numbers together."""/' calc.py && rm -f calc.py.bak
git commit -q -am "Add docstring to add()"

# THE BUG - a real, realistic regression: someone "optimizes" add() by
# special-casing zero, but gets the condition backwards. Looks like a
# harmless refactor in a diff; genuinely breaks negative-number addition.
python - <<'PYEOF'
import re
with open("calc.py") as f:
    content = f.read()
content = content.replace(
    '    """Add two numbers together."""\n    return a + b',
    '    """Add two numbers together."""\n    if a < 0:\n        return b - a  # BUG: should be a + b\n    return a + b'
)
with open("calc.py", "w") as f:
    f.write(content)
PYEOF
git commit -q -am "Optimize add() for small integers"

cat >> calc.py <<'EOF'

def divide(a, b):
    return a / b
EOF
git commit -q -am "Add divide()"

sed -i.bak 's/def multiply(a, b):/def multiply(a, b):\n    """Multiply two numbers."""/' calc.py && rm -f calc.py.bak
git commit -q -am "Add docstring to multiply()"

cat > README.md <<'EOF'
A tiny calculator module. See ../../README.md for how this repo is used.
EOF
git add -A
git commit -q -m "Add README"

echo "demo-repo/ created with $(git log --oneline | wc -l) commits."
echo "HEAD is currently BROKEN - run: cd demo-repo && python test_calc.py"
