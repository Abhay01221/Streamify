"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dsaProblems = void 0;
/** Original practice exercises. No statements, tests, or editorials are copied from other platforms. */
exports.dsaProblems = [
    {
        number: 11001, slug: 'bit-lanterns', title: 'Bit Lanterns', difficulty: 'EASY', tag: 'bit-manipulation',
        description: 'A non-negative integer encodes which lanterns are lit: each set bit represents one lit lantern. Count the lit lanterns.\n\n## Input format\nOne decimal integer n.\n\n## Output format\nOne integer: the number of set bits in n.',
        constraints: ['0 <= n < 2^63.'],
        reference: 'n=int(input())\ncount=0\nwhile n:\n n &= n-1\n count += 1\nprint(count)',
        testCases: [
            { input: '13', output: '3', isSample: true }, { input: '0', output: '0', isSample: false },
            { input: '1024', output: '1', isSample: false }, { input: '9223372036854775807', output: '63', isSample: false },
        ],
    },
    {
        number: 11002, slug: 'range-ledger', title: 'Range Ledger', difficulty: 'EASY', tag: 'prefix-sum',
        description: 'Answer several total queries on an unchanged ledger. A query [left, right] asks for the sum from index left through right, inclusive.\n\n## Input format\nA JSON integer array on the first line. A JSON array of query pairs on the second line.\n\n## Output format\nOne query answer per line, in input order. Print nothing when there are no queries.',
        constraints: ['0 <= array length <= 2000.', '0 <= number of queries <= 2000.', 'Each value is between -1000000 and 1000000.', 'Each query satisfies 0 <= left <= right < array length. An empty array has no queries.'],
        reference: 'import json\na=json.loads(input())\nqueries=json.loads(input())\np=[0]\nfor x in a: p.append(p[-1]+x)\nfor l,r in queries: print(p[r+1]-p[l])',
        testCases: [
            { input: '[4,-2,7,1]\n[[0,2],[1,1],[2,3]]', output: '9\n-2\n8', isSample: true },
            { input: '[]\n[]', output: '', isSample: false },
            { input: '[-9]\n[[0,0],[0,0]]', output: '-9\n-9', isSample: false },
            { input: '[0,0,0]\n[[0,2]]', output: '0', isSample: false },
        ],
    },
    {
        number: 11003, slug: 'warm-window', title: 'Warm Window', difficulty: 'MEDIUM', tag: 'sliding-window',
        description: 'A sensor records integer readings. Find the largest sum of exactly k consecutive readings. Negative readings are allowed.\n\n## Input format\nA JSON integer array, then k on the next line.\n\n## Output format\nThe largest window sum.',
        constraints: ['1 <= array length <= 2000.', '1 <= k <= array length.', 'Each reading is between -1000000 and 1000000.'],
        reference: 'import json\na=json.loads(input())\nk=int(input())\ns=sum(a[:k])\nbest=s\nfor i in range(k,len(a)):\n s += a[i]-a[i-k]\n best=max(best,s)\nprint(best)',
        testCases: [
            { input: '[2,-1,5,-2,3]\n3', output: '6', isSample: true },
            { input: '[-8,-3,-5]\n2', output: '-8', isSample: false },
            { input: '[-4]\n1', output: '-4', isSample: false },
            { input: '[2,3,4]\n3', output: '9', isSample: false },
        ],
    },
    {
        number: 11004, slug: 'chain-splice', title: 'Chain Splice', difficulty: 'MEDIUM', tag: 'linked-list',
        description: 'Construct a singly linked list from the values in input order. Reverse its links in place and print the resulting values. For the exercise, implement nodes and pointer reversal rather than reversing the input array.\n\n## Input format\nOne JSON integer array.\n\n## Output format\nThe reversed values separated by spaces; an empty list produces an empty line.',
        constraints: ['0 <= number of nodes <= 2000.', 'Node values are between -1000000 and 1000000.'],
        reference: 'import json\nclass Node:\n def __init__(self,value,next=None): self.value,self.next=value,next\nhead=None\nfor x in reversed(json.loads(input())): head=Node(x,head)\nprev=None\nwhile head:\n nxt=head.next\n head.next=prev\n prev,head=head,nxt\na=[]\nwhile prev:\n a.append(prev.value)\n prev=prev.next\nprint(*a)',
        testCases: [
            { input: '[4,7,2]', output: '2 7 4', isSample: true }, { input: '[]', output: '', isSample: false },
            { input: '[9]', output: '9', isSample: false }, { input: '[-1,0,-1,2]', output: '2 -1 0 -1', isSample: false },
        ],
    },
    {
        number: 11005, slug: 'next-beacon', title: 'Next Beacon', difficulty: 'MEDIUM', tag: 'monotonic-stack',
        description: 'For each beacon height, find the first strictly taller beacon to its right. Report its index, or -1 if none exists. Equal heights are not taller.\n\n## Input format\nOne JSON integer array of heights.\n\n## Output format\nOne space-separated sequence of zero-based indices.',
        constraints: ['0 <= number of heights <= 2000.', '0 <= height <= 1000000.'],
        reference: 'import json\na=json.loads(input())\nans=[-1]*len(a)\nstack=[]\nfor i,x in enumerate(a):\n while stack and a[stack[-1]]<x: ans[stack.pop()]=i\n stack.append(i)\nprint(*ans)',
        testCases: [
            { input: '[3,1,4,2,5]', output: '2 2 4 4 -1', isSample: true },
            { input: '[]', output: '', isSample: false }, { input: '[2,2,2]', output: '-1 -1 -1', isSample: false },
            { input: '[5,4,3,2]', output: '-1 -1 -1 -1', isSample: false },
        ],
    },
    {
        number: 11006, slug: 'bundle-subsets', title: 'Bundle Subsets', difficulty: 'MEDIUM', tag: 'backtracking',
        description: 'Count subsets of the supplied parcel positions whose values sum to target. Every position may be chosen at most once. Equal values at different positions are distinct choices. Include the empty subset when target is zero.\n\n## Input format\nA JSON integer array, then target on the next line.\n\n## Output format\nThe number of valid subsets.',
        constraints: ['0 <= number of values <= 18.', 'Each value and target is between -1000 and 1000.'],
        reference: 'import json\na=json.loads(input())\nt=int(input())\ndef count(i,total):\n if i==len(a): return int(total==t)\n return count(i+1,total)+count(i+1,total+a[i])\nprint(count(0,0))',
        testCases: [
            { input: '[1,2,3]\n3', output: '2', isSample: true }, { input: '[]\n0', output: '1', isSample: false },
            { input: '[0,0]\n0', output: '4', isSample: false }, { input: '[-1,1,2]\n1', output: '2', isSample: false },
            { input: '[]\n5', output: '0', isSample: false },
        ],
    },
    {
        number: 11007, slug: 'meeting-docks', title: 'Meeting Docks', difficulty: 'MEDIUM', tag: 'greedy',
        description: 'One dock can host non-overlapping bookings. Each booking occupies the half-open interval [start, end), so a booking may begin exactly when another ends. Select as many bookings as possible and report that count.\n\n## Input format\nOne JSON array of [start, end] pairs.\n\n## Output format\nThe maximum number of compatible bookings.',
        constraints: ['0 <= number of bookings <= 2000.', '0 <= start < end <= 1000000.'],
        reference: 'import json\na=sorted(json.loads(input()),key=lambda p:(p[1],p[0]))\nend=-1\ncount=0\nfor s,e in a:\n if s>=end:\n  count+=1\n  end=e\nprint(count)',
        testCases: [
            { input: '[[1,4],[2,3],[3,5],[5,6]]', output: '3', isSample: true },
            { input: '[]', output: '0', isSample: false }, { input: '[[0,1],[1,2],[2,3]]', output: '3', isSample: false },
            { input: '[[0,9],[1,8],[2,7]]', output: '1', isSample: false },
        ],
    },
    {
        number: 11008, slug: 'kth-supply', title: 'Kth Supply', difficulty: 'MEDIUM', tag: 'heap',
        description: 'Find the kth largest supply value, counting duplicate values as separate entries. Maintain a min-heap containing at most k values to practice bounded heaps.\n\n## Input format\nA JSON integer array, then k on the next line.\n\n## Output format\nThe kth largest value.',
        constraints: ['1 <= array length <= 2000.', '1 <= k <= array length.', 'Each value is between -1000000 and 1000000.'],
        reference: 'import json,heapq\na=json.loads(input())\nk=int(input())\nh=[]\nfor x in a:\n if len(h)<k: heapq.heappush(h,x)\n elif x>h[0]: heapq.heapreplace(h,x)\nprint(h[0])',
        testCases: [
            { input: '[8,2,8,5,3]\n3', output: '5', isSample: true }, { input: '[-7]\n1', output: '-7', isSample: false },
            { input: '[-2,-5,-1]\n3', output: '-5', isSample: false }, { input: '[4,4,4]\n2', output: '4', isSample: false },
        ],
    },
    {
        number: 11009, slug: 'prefix-depot', title: 'Prefix Depot', difficulty: 'MEDIUM', tag: 'trie',
        description: 'A depot stores lowercase labels. For every queried prefix, count stored labels that start with it. Duplicate labels count separately and the empty prefix matches every label. Implement a trie with counts along its paths.\n\n## Input format\nA JSON array of lowercase label strings, then a JSON array of prefix strings on the next line.\n\n## Output format\nOne count per query, in input order.',
        constraints: ['0 <= number of labels and queries <= 500.', 'Each label/prefix has at most 30 lowercase English letters; empty strings are allowed.'],
        reference: 'import json\nwords=json.loads(input())\nqueries=json.loads(input())\nroot={"count":0,"children":{}}\nfor w in words:\n node=root\n node["count"]+=1\n for c in w:\n  node=node["children"].setdefault(c,{"count":0,"children":{}})\n  node["count"]+=1\nfor q in queries:\n node=root\n for c in q:\n  node=node["children"].get(c)\n  if node is None: break\n print(0 if node is None else node["count"])',
        testCases: [
            { input: '["forge","forest","form","boat"]\n["for","fo","forge","x"]', output: '3\n3\n1\n0', isSample: true },
            { input: '[]\n[""]', output: '0', isSample: false },
            { input: '["a","a",""]\n["","a","aa"]', output: '3\n2\n0', isSample: false },
            { input: '["a"]\n[]', output: '', isSample: false },
        ],
    },
    {
        number: 11010, slug: 'hop-map', title: 'Hop Map', difficulty: 'MEDIUM', tag: 'breadth-first-search',
        description: 'Report the smallest number of edges needed to reach every vertex from a source in an undirected graph. Use -1 for unreachable vertices. Parallel edges and self-loops may appear.\n\n## Input format\nn on the first line, a JSON array of [u, v] edges on the second, and source on the third.\n\n## Output format\nThe n distances, in vertex order, separated by spaces.',
        constraints: ['1 <= n <= 2000; vertices are 0 through n-1.', '0 <= number of edges <= 3000.', 'All endpoints and source are valid vertices.'],
        reference: 'import json\nfrom collections import deque\nn=int(input())\nedges=json.loads(input())\ns=int(input())\ng=[[] for _ in range(n)]\nfor u,v in edges:\n g[u].append(v)\n g[v].append(u)\nd=[-1]*n\nd[s]=0\nq=deque([s])\nwhile q:\n u=q.popleft()\n for v in g[u]:\n  if d[v]==-1:\n   d[v]=d[u]+1\n   q.append(v)\nprint(*d)',
        testCases: [
            { input: '5\n[[0,1],[1,2],[0,3]]\n0', output: '0 1 2 1 -1', isSample: true },
            { input: '1\n[]\n0', output: '0', isSample: false },
            { input: '3\n[]\n2', output: '-1 -1 0', isSample: false },
            { input: '3\n[[0,0],[0,1],[0,1],[1,2],[2,0]]\n1', output: '1 0 1', isSample: false },
        ],
    },
    {
        number: 11011, slug: 'task-order', title: 'Task Order', difficulty: 'MEDIUM', tag: 'topological-sort',
        description: 'A directed edge [u, v] means task u must finish before task v. Print the lexicographically smallest valid ordering of all tasks, choosing the smallest available task each time. If the dependencies contain a cycle, print IMPOSSIBLE.\n\n## Input format\nn on the first line and a JSON array of directed [u, v] edges on the next line.\n\n## Output format\nSpace-separated task numbers, or IMPOSSIBLE. For zero tasks print an empty line.',
        constraints: ['0 <= n <= 2000; tasks are 0 through n-1.', '0 <= number of edges <= 3000.', 'All endpoints are valid tasks.'],
        reference: 'import json,heapq\nn=int(input())\nedges=json.loads(input())\ng=[[] for _ in range(n)]\ndeg=[0]*n\nfor u,v in edges:\n g[u].append(v)\n deg[v]+=1\nh=[u for u in range(n) if deg[u]==0]\nheapq.heapify(h)\norder=[]\nwhile h:\n u=heapq.heappop(h)\n order.append(u)\n for v in g[u]:\n  deg[v]-=1\n  if deg[v]==0: heapq.heappush(h,v)\nif len(order)==n: print(*order)\nelse: print("IMPOSSIBLE")',
        testCases: [
            { input: '4\n[[0,2],[1,2],[2,3]]', output: '0 1 2 3', isSample: true },
            { input: '0\n[]', output: '', isSample: false },
            { input: '2\n[[0,1],[1,0]]', output: 'IMPOSSIBLE', isSample: false },
            { input: '4\n[[3,1],[3,0]]', output: '2 3 0 1', isSample: false },
            { input: '1\n[[0,0]]', output: 'IMPOSSIBLE', isSample: false },
        ],
    },
    {
        number: 11012, slug: 'courier-distances', title: 'Courier Distances', difficulty: 'MEDIUM', tag: 'shortest-path',
        description: 'Find minimum travel costs from a source through directed roads with non-negative costs. Roads may repeat and may cost zero. Print -1 for destinations that cannot be reached.\n\n## Input format\nn on the first line, a JSON array of [from, to, cost] roads on the second, and source on the third.\n\n## Output format\nThe n minimum costs in vertex order, separated by spaces.',
        constraints: ['1 <= n <= 1000; vertices are 0 through n-1.', '0 <= number of roads <= 3000.', '0 <= cost <= 1000000; endpoints and source are valid.'],
        reference: 'import json,heapq\nn=int(input())\nedges=json.loads(input())\ns=int(input())\ng=[[] for _ in range(n)]\nfor u,v,w in edges: g[u].append((v,w))\nd=[float("inf")]*n\nd[s]=0\nh=[(0,s)]\nwhile h:\n cost,u=heapq.heappop(h)\n if cost!=d[u]: continue\n for v,w in g[u]:\n  if cost+w<d[v]:\n   d[v]=cost+w\n   heapq.heappush(h,(d[v],v))\nprint(*(x if x!=float("inf") else -1 for x in d))',
        testCases: [
            { input: '4\n[[0,1,8],[0,2,2],[2,1,1],[1,3,4],[2,3,9]]\n0', output: '0 3 2 7', isSample: true },
            { input: '1\n[]\n0', output: '0', isSample: false },
            { input: '3\n[[0,1,0]]\n0', output: '0 0 -1', isSample: false },
            { input: '3\n[[0,1,9],[0,1,2],[1,2,0],[2,1,0]]\n0', output: '0 2 2', isSample: false },
        ],
    },
    {
        number: 11013, slug: 'cable-budget', title: 'Cable Budget', difficulty: 'HARD', tag: 'minimum-spanning-tree',
        description: 'Connect all outposts using undirected candidate cables with the minimum total cost. If it is impossible to connect every outpost, print -1. Self-loops and parallel candidates are allowed. Zero or one outpost needs no cable.\n\n## Input format\nn on the first line and a JSON array of [u, v, cost] cables on the next line.\n\n## Output format\nThe minimum total cost, or -1.',
        constraints: ['0 <= n <= 1000; outposts are 0 through n-1.', '0 <= number of cables <= 3000.', '0 <= cost <= 1000000; endpoints are valid.'],
        reference: 'import json\nn=int(input())\nedges=json.loads(input())\np=list(range(n))\nsize=[1]*n\ndef find(x):\n while x!=p[x]:\n  p[x]=p[p[x]]\n  x=p[x]\n return x\ntotal=used=0\nfor u,v,w in sorted(edges,key=lambda e:e[2]):\n a,b=find(u),find(v)\n if a==b: continue\n if size[a]<size[b]: a,b=b,a\n p[b]=a\n size[a]+=size[b]\n total+=w\n used+=1\nprint(total if used==max(0,n-1) else -1)',
        testCases: [
            { input: '4\n[[0,1,4],[0,2,1],[1,2,2],[1,3,5],[2,3,3]]', output: '6', isSample: true },
            { input: '0\n[]', output: '0', isSample: false }, { input: '1\n[[0,0,9]]', output: '0', isSample: false },
            { input: '3\n[[0,1,2]]', output: '-1', isSample: false },
            { input: '2\n[[0,1,7],[0,1,0]]', output: '0', isSample: false },
        ],
    },
    {
        number: 11014, slug: 'grid-deliveries', title: 'Grid Deliveries', difficulty: 'MEDIUM', tag: 'dynamic-programming',
        description: 'Count routes from the top-left cell to the bottom-right cell of a rectangular grid. Move only right or down. A 1 marks a blocked cell and a 0 marks a free cell. A route may not enter a blocked cell.\n\n## Input format\nOne JSON rectangular array of integer rows. An empty grid is encoded as [].\n\n## Output format\nThe exact number of valid routes. An empty grid has zero routes.',
        constraints: ['0 <= row count <= 30.', 'For a non-empty grid, 1 <= column count <= 30.', 'Each cell is 0 or 1. All rows have equal length.'],
        reference: 'import json\ng=json.loads(input())\nif not g:\n print(0)\nelse:\n dp=[0]*len(g[0])\n dp[0]=1\n for row in g:\n  for j,blocked in enumerate(row):\n   if blocked: dp[j]=0\n   elif j: dp[j]+=dp[j-1]\n print(dp[-1])',
        testCases: [
            { input: '[[0,0,0],[0,1,0],[0,0,0]]', output: '2', isSample: true },
            { input: '[]', output: '0', isSample: false }, { input: '[[0]]', output: '1', isSample: false },
            { input: '[[1]]', output: '0', isSample: false }, { input: '[[0,0],[0,1]]', output: '0', isSample: false },
        ],
    },
    {
        number: 11015, slug: 'pack-value', title: 'Pack Value', difficulty: 'MEDIUM', tag: 'knapsack',
        description: 'Choose parcels to maximize value without exceeding a weight capacity. Each parcel may be selected at most once. Selecting no parcels is allowed.\n\n## Input format\nA JSON array of [weight, value] parcels, then integer capacity on the next line.\n\n## Output format\nThe maximum achievable value.',
        constraints: ['0 <= number of parcels <= 100.', '1 <= weight <= 1000; 0 <= value <= 1000000.', '0 <= capacity <= 2000.'],
        reference: 'import json\nitems=json.loads(input())\ncapacity=int(input())\ndp=[0]*(capacity+1)\nfor weight,value in items:\n for c in range(capacity,weight-1,-1): dp[c]=max(dp[c],dp[c-weight]+value)\nprint(dp[capacity])',
        testCases: [
            { input: '[[2,5],[3,8],[4,9]]\n5', output: '13', isSample: true },
            { input: '[]\n10', output: '0', isSample: false }, { input: '[[1,9]]\n0', output: '0', isSample: false },
            { input: '[[2,5]]\n4', output: '5', isSample: false }, { input: '[[9,100],[1,3]]\n2', output: '3', isSample: false },
        ],
    },
    {
        number: 11016, slug: 'common-log', title: 'Common Log', difficulty: 'MEDIUM', tag: 'dynamic-programming',
        description: 'Two logs contain lowercase letters. Find the length of their longest common subsequence. A subsequence preserves order but may skip characters; its characters do not need to be adjacent.\n\n## Input format\nOne JSON array containing exactly two strings.\n\n## Output format\nThe longest common subsequence length.',
        constraints: ['Each string contains at most 300 lowercase English letters; empty strings are allowed.'],
        reference: 'import json\na,b=json.loads(input())\nprev=[0]*(len(b)+1)\nfor x in a:\n cur=[0]*(len(b)+1)\n for j,y in enumerate(b,1):\n  cur[j]=prev[j-1]+1 if x==y else max(prev[j],cur[j-1])\n prev=cur\nprint(prev[-1])',
        testCases: [
            { input: '["axbycz","abc"]', output: '3', isSample: true },
            { input: '["","abc"]', output: '0', isSample: false }, { input: '["aaaa","aa"]', output: '2', isSample: false },
            { input: '["abc","xyz"]', output: '0', isSample: false }, { input: '["abc","cba"]', output: '1', isSample: false },
        ],
    },
    {
        number: 11017, slug: 'dynamic-ledger', title: 'Dynamic Ledger', difficulty: 'HARD', tag: 'fenwick-tree',
        description: 'Maintain a changing ledger. The operation ["add", i, delta] adds delta to position i. The operation ["sum", left, right] requests the inclusive range sum. Process operations in input order using a Fenwick tree or segment tree.\n\n## Input format\nA JSON integer array on the first line, then a JSON array of operation arrays on the next line.\n\n## Output format\nOne answer per sum operation. Add operations produce no output.',
        constraints: ['0 <= array length <= 2000.', '0 <= number of operations <= 3000.', 'Values and deltas are between -1000000 and 1000000.', 'All indices are valid; range queries satisfy left <= right. An empty array has no operations.'],
        reference: 'import json\na=json.loads(input())\nops=json.loads(input())\ntree=[0]*(len(a)+1)\ndef add(i,x):\n i+=1\n while i<len(tree):\n  tree[i]+=x\n  i+=i&-i\ndef prefix(end):\n s=0\n while end:\n  s+=tree[end]\n  end-=end&-end\n return s\nfor i,x in enumerate(a): add(i,x)\nfor op in ops:\n if op[0]=="add": add(op[1],op[2])\n else: print(prefix(op[2]+1)-prefix(op[1]))',
        testCases: [
            { input: '[2,4,-1]\n[["sum",0,2],["add",1,-3],["sum",1,2],["add",2,5],["sum",0,2]]', output: '5\n0\n7', isSample: true },
            { input: '[]\n[]', output: '', isSample: false },
            { input: '[0]\n[["add",0,-7],["sum",0,0],["add",0,7],["sum",0,0]]', output: '-7\n0', isSample: false },
            { input: '[1,2,3,4]\n[["sum",0,0],["sum",3,3],["sum",0,3]]', output: '1\n4\n10', isSample: false },
        ],
    },
    {
        number: 11018, slug: 'pattern-stations', title: 'Pattern Stations', difficulty: 'HARD', tag: 'string-matching',
        description: 'Find every starting position where a non-empty pattern occurs in a text. Overlapping matches count. Use a linear string-matching algorithm such as KMP.\n\n## Input format\nOne JSON array containing [text, pattern].\n\n## Output format\nAll zero-based starting indices separated by spaces. Print an empty line if no match exists.',
        constraints: ['0 <= text length <= 3000.', '1 <= pattern length <= 1000.', 'Text and pattern contain lowercase English letters.'],
        reference: 'import json\ntext,pattern=json.loads(input())\nlps=[0]*len(pattern)\nj=0\nfor i in range(1,len(pattern)):\n while j and pattern[i]!=pattern[j]: j=lps[j-1]\n if pattern[i]==pattern[j]: j+=1\n lps[i]=j\nans=[]\nj=0\nfor i,c in enumerate(text):\n while j and c!=pattern[j]: j=lps[j-1]\n if c==pattern[j]: j+=1\n if j==len(pattern):\n  ans.append(i-len(pattern)+1)\n  j=lps[j-1]\nprint(*ans)',
        testCases: [
            { input: '["ababa","aba"]', output: '0 2', isSample: true }, { input: '["","a"]', output: '', isSample: false },
            { input: '["aaaaa","aa"]', output: '0 1 2 3', isSample: false },
            { input: '["abc","abcd"]', output: '', isSample: false }, { input: '["abcabc","abc"]', output: '0 3', isSample: false },
        ],
    },
];
