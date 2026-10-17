const PYTHON_PREAMBLE = `
import sys
import json
import ast
from typing import Optional, List, Tuple, Dict, Any

# ── ListNode ──────────────────────────────────────────────────────────────
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return f"ListNode({self.val})"

def _array_to_list(arr):
    if arr is None: return None
    dummy = ListNode()
    cur = dummy
    for v in arr:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def _list_to_array(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

# ── TreeNode ──────────────────────────────────────────────────────────────
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _array_to_tree(arr):
    if not arr: return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def _tree_to_array(root):
    if not root: return []
    result, queue = [], [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

`;

// ── Python driver appended after the user's Solution class ────────────────

const PYTHON_DRIVER = `

def _parse(s):
    s = s.strip()
    try:
        return json.loads(s)
    except Exception:
        try:
            return ast.literal_eval(s)
        except Exception:
            return s

def _format(v):
    if isinstance(v, list):
        return '[' + ','.join(str(x) for x in v) + ']'
    if isinstance(v, ListNode):
        return '[' + ','.join(str(x) for x in _list_to_array(v)) + ']'
    if isinstance(v, TreeNode):
        return '[' + ','.join('null' if x is None else str(x) for x in _tree_to_array(v)) + ']'
    return str(v)

def _convert_arg(arg, hint):
    """Convert a parsed JSON value to the data structure the solution expects."""
    if hint == 'listnode' and isinstance(arg, list):
        return _array_to_list(arg)
    if hint == 'treenode' and isinstance(arg, list):
        return _array_to_tree(arg)
    return arg

def _detect_hints(method):
    """Inspect type annotations to decide how to convert each argument."""
    import inspect
    hints = []
    try:
        sig = inspect.signature(method)
        params = list(sig.parameters.values())
        # skip 'self'
        for p in params[1:] if params and params[0].name == 'self' else params:
            ann = str(p.annotation).lower()
            if 'listnode' in ann:
                hints.append('listnode')
            elif 'treenode' in ann:
                hints.append('treenode')
            else:
                hints.append('value')
    except Exception:
        pass
    return hints

if __name__ == '__main__':
    lines = [l for l in sys.stdin.read().splitlines() if l.strip()]
    raw_args = [_parse(l) for l in lines]
    sol = Solution()
    methods = [m for m in dir(sol) if not m.startswith('_')]
    if methods:
        method = getattr(sol, methods[0])
        hints = _detect_hints(method)
        # Pad hints if fewer annotations than args
        while len(hints) < len(raw_args):
            hints.append('value')
        converted = [_convert_arg(a, h) for a, h in zip(raw_args, hints)]
        result = method(*converted)
        if result is not None:
            print(_format(result))
`;

/**
 * Detects if the code is a LeetCode-style class solution (has a class with methods)
 * vs a standalone script that already reads stdin and prints output.
 */
const isClassSolution = (code: string, language: string): boolean => {
  const lang = language.toLowerCase();
  if (lang === 'python' || lang === 'python3') {
    return /class\s+Solution\s*:/i.test(code);
  }
  if (lang === 'javascript' || lang === 'js') {
    return /var\s+\w+\s*=\s*function|function\s+\w+\s*\(/.test(code) && !/process\.stdin|readline/.test(code);
  }
  if (lang === 'typescript' || lang === 'ts') {
    return /function\s+\w+\s*\(/.test(code) && !/process\.stdin|readline/.test(code);
  }
  return false;
};

/**
 * Wraps a LeetCode-style solution with:
 *  1. A preamble that defines ListNode, TreeNode, typing imports
 *  2. A driver that reads stdin, converts inputs, calls Solution, prints output
 */
export const wrapCode = (code: string, language: string): string => {
  const lang = language.toLowerCase();

  if (!isClassSolution(code, language)) return code;

  if (lang === 'python' || lang === 'python3') {
    // Strip any existing ListNode / TreeNode / typing imports the user may have
    // written so we don't get duplicate-class errors
    const stripped = code
      .replace(/^from\s+typing\s+import\s+[^\n]+\n?/gm, '')
      .replace(/^import\s+typing[^\n]*\n?/gm, '')
      .replace(/^class\s+ListNode\s*:[\s\S]*?(?=\nclass |\ndef |(?![\s\S]))/gm, '')
      .replace(/^class\s+TreeNode\s*:[\s\S]*?(?=\nclass |\ndef |(?![\s\S]))/gm, '');

    return PYTHON_PREAMBLE + stripped + PYTHON_DRIVER;
  }

  return code;
};
