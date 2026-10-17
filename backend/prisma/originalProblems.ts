export const originalProblems = [
  {
    "number": 10001,
    "slug": "ledger-total",
    "title": "Ledger Total",
    "difficulty": "EASY",
    "tag": "array",
    "description": "A ledger contains integer changes. Print their sum.\n\n## Input format\nOne JSON array of integers.\n\n## Output format\nOne integer.",
    "reference": "import json\na=json.loads(input())\nprint(sum(a))",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "[]",
        "output": "0",
        "isSample": true
      },
      {
        "input": "[3,-2,8]",
        "output": "9",
        "isSample": false
      },
      {
        "input": "[-5,-7]",
        "output": "-12",
        "isSample": false
      }
    ]
  },
  {
    "number": 10002,
    "slug": "signal-reverse",
    "title": "Signal Reverse",
    "difficulty": "EASY",
    "tag": "string",
    "description": "Reverse a line of text, preserving spaces.\n\n## Input format\nOne line, possibly empty.\n\n## Output format\nThe reversed line.",
    "reference": "import sys\ns=sys.stdin.readline().rstrip(\"\\n\")\nprint(s[::-1])",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "forge",
        "output": "egrof",
        "isSample": true
      },
      {
        "input": "",
        "output": "",
        "isSample": false
      },
      {
        "input": "a b",
        "output": "b a",
        "isSample": false
      }
    ]
  },
  {
    "number": 10003,
    "slug": "parcel-frequencies",
    "title": "Parcel Frequencies",
    "difficulty": "EASY",
    "tag": "hash-table",
    "description": "Print the count of each integer, ordered by integer value.\n\n## Input format\nOne JSON integer array.\n\n## Output format\nEach line contains value and count, separated by one space.",
    "reference": "import json\nfrom collections import Counter\nc=Counter(json.loads(input()))\nfor k in sorted(c): print(k,c[k])",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "[2,1,2]",
        "output": "1 1\n2 2",
        "isSample": true
      },
      {
        "input": "[]",
        "output": "",
        "isSample": false
      },
      {
        "input": "[-1,-1,3]",
        "output": "-1 2\n3 1",
        "isSample": false
      }
    ]
  },
  {
    "number": 10004,
    "slug": "sorted-manifest",
    "title": "Sorted Manifest",
    "difficulty": "EASY",
    "tag": "sorting",
    "description": "Sort the manifest identifiers in ascending order.\n\n## Input format\nOne JSON integer array.\n\n## Output format\nSorted integers separated by one space.",
    "reference": "import json\nprint(*sorted(json.loads(input())))",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "[3,1,2]",
        "output": "1 2 3",
        "isSample": true
      },
      {
        "input": "[]",
        "output": "",
        "isSample": false
      },
      {
        "input": "[2,-1,2]",
        "output": "-1 2 2",
        "isSample": false
      }
    ]
  },
  {
    "number": 10005,
    "slug": "beacon-search",
    "title": "Beacon Search",
    "difficulty": "MEDIUM",
    "tag": "binary-search",
    "description": "Find the first index of the target in a sorted array, or print -1.\n\n## Input format\nA sorted JSON integer array, then the target on the next line.\n\n## Output format\nOne zero-based index or -1.",
    "reference": "import json,bisect\na=json.loads(input())\nt=int(input())\ni=bisect.bisect_left(a,t)\nprint(i if i<len(a) and a[i]==t else -1)",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "[1,3,3,8]\n3",
        "output": "1",
        "isSample": true
      },
      {
        "input": "[]\n4",
        "output": "-1",
        "isSample": false
      },
      {
        "input": "[2,4,6]\n5",
        "output": "-1",
        "isSample": false
      }
    ]
  },
  {
    "number": 10006,
    "slug": "balanced-crates",
    "title": "Balanced Crates",
    "difficulty": "MEDIUM",
    "tag": "stack",
    "description": "Determine whether a line containing only round brackets is balanced.\n\n## Input format\nOne line of round brackets, possibly empty.\n\n## Output format\nYES when balanced, otherwise NO.",
    "reference": "import sys\ns=sys.stdin.readline().rstrip(\"\\n\")\nb=0\nok=True\nfor c in s:\n b += 1 if c==\"(\" else -1\n if b<0: ok=False\nprint(\"YES\" if ok and b==0 else \"NO\")",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "(())",
        "output": "YES",
        "isSample": true
      },
      {
        "input": "",
        "output": "YES",
        "isSample": false
      },
      {
        "input": ")(()",
        "output": "NO",
        "isSample": false
      }
    ]
  },
  {
    "number": 10007,
    "slug": "tree-height-log",
    "title": "Tree Height Log",
    "difficulty": "MEDIUM",
    "tag": "tree",
    "description": "A binary tree is encoded in heap order: children of index i are 2i+1 and 2i+2. Null entries represent missing nodes. Print its height in nodes. Descendants of a null node are ignored.\n\n## Input format\nOne JSON array of integer or null values.\n\n## Output format\nThe height; empty trees have height 0.",
    "reference": "import json\na=json.loads(input())\ndef h(i):\n if i>=len(a) or a[i] is None: return 0\n return 1+max(h(2*i+1),h(2*i+2))\nprint(h(0))",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "[1,2,3,null,4]",
        "output": "3",
        "isSample": true
      },
      {
        "input": "[]",
        "output": "0",
        "isSample": false
      },
      {
        "input": "[null,2,3]",
        "output": "0",
        "isSample": false
      }
    ]
  },
  {
    "number": 10008,
    "slug": "island-links",
    "title": "Island Links",
    "difficulty": "MEDIUM",
    "tag": "graph",
    "description": "Count connected components in an undirected graph whose vertices are numbered from 0 to n-1.\n\n## Input format\nn on the first line and a JSON array of two-element edge arrays on the next line.\n\n## Output format\nOne integer component count.",
    "reference": "import json\nn=int(input())\ne=json.loads(input())\np=list(range(n))\ndef root(x):\n while p[x]!=x:\n  p[x]=p[p[x]]\n  x=p[x]\n return x\nfor a,b in e: p[root(a)]=root(b)\nprint(len({root(i) for i in range(n)}))",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "4\n[[0,1],[2,3]]",
        "output": "2",
        "isSample": true
      },
      {
        "input": "0\n[]",
        "output": "0",
        "isSample": false
      },
      {
        "input": "3\n[[0,1],[1,2],[0,2]]",
        "output": "1",
        "isSample": false
      }
    ]
  },
  {
    "number": 10009,
    "slug": "stairway-routes",
    "title": "Stairway Routes",
    "difficulty": "MEDIUM",
    "tag": "dynamic-programming",
    "description": "Count ways to climb n steps using moves of one or two steps. There is one way to climb zero steps.\n\n## Input format\nOne integer n, 0 <= n <= 80.\n\n## Output format\nThe exact number of routes.",
    "reference": "n=int(input())\na,b=1,1\nfor _ in range(n): a,b=b,a+b\nprint(a)",
    "constraints": [
      "Input length is at most 10000 characters. Integers fit signed 32-bit unless stated otherwise."
    ],
    "testCases": [
      {
        "input": "4",
        "output": "5",
        "isSample": true
      },
      {
        "input": "0",
        "output": "1",
        "isSample": false
      },
      {
        "input": "10",
        "output": "89",
        "isSample": false
      }
    ]
  }
] as const;
