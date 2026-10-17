"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dsaCourse = void 0;
/** Repository-owned teaching material, examples, and practice ordering. */
exports.dsaCourse = {
    slug: 'dsa-foundations-to-interviews',
    title: 'DSA: Foundations to Interviews',
    description: 'A 90-day Python learning path with worked examples, original judged exercises, revision checkpoints, and an advanced track. Build the habit of stating an invariant, proving correctness, and measuring complexity before submitting.',
    difficulty: 'Beginner to advanced',
    estimatedDays: 90,
    isPublished: true,
    isPremium: false,
    modules: [
        {
            slug: 'foundations', title: '1. Python, problem solving, and complexity',
            description: 'Read an input contract, choose representations, test boundaries, and reason about growth.',
            lessons: [{
                    slug: 'read-model-measure', title: 'Read, model, prove, measure', estimatedMinutes: 35,
                    summary: 'Turn a statement into a small correct program and explain its time and space requirements.',
                    problemSlugs: ['ledger-total'],
                    resources: [{ title: 'Python tutorial: data structures', url: 'https://docs.python.org/3/tutorial/datastructures.html', kind: 'reading' }],
                    content: `## Start with the contract
Before choosing an algorithm, write down the input shape, allowed values, required output, and maximum input size. A sample is one illustration, not the complete contract. For Ledger Total, the input is a JSON list, negative changes are valid, and an empty list must total zero. Parse with json.loads rather than eval: data should stay data.

Keep a variable meaning precise. After processing the first i values, total equals their sum. This loop invariant is true before the first iteration, remains true when the next value is added, and gives the requested answer when the loop ends.

## Worked example
For [3, -2, 8], total changes from 0 to 3 to 1 to 9.

\`\`\`python
import json
changes = json.loads(input())
total = 0
for change in changes:
    total += change
print(total)
\`\`\`

## Measure the cost
The loop visits n entries, so it takes O(n) time and O(1) auxiliary space; storing the input list itself takes O(n). Big-O describes how work grows and does not predict exact seconds. Two nested loops are not automatically quadratic: count how often their bodies execute. Binary search is O(log n), while enumerating every subset costs O(2^n). Python integers can grow beyond machine words, so arithmetic on very large values also has a cost.

## Common errors and checkpoint
Do not initialize a sum with the first element unless empty input is impossible. Distinguish a new list from an alias: b = a shares the same list, while b = a[:] copies its top-level entries. Practice writing a function that returns an answer separately from input/output. Submit Ledger Total, then explain the invariant aloud and test [], a single negative value, and values summing to zero. For revision, compare a linear sum with a deliberately quadratic repeated-sum implementation and identify the redundant work.`,
                }],
        },
        {
            slug: 'math-and-bits', title: '2. Mathematics and bit manipulation',
            description: 'Divisibility, Euclid, primes, modular arithmetic, and integer bit operations.',
            lessons: [{
                    slug: 'number-and-mask-tools', title: 'Numbers, divisors, and masks', estimatedMinutes: 40,
                    summary: 'Use small mathematical observations to replace expensive enumeration.',
                    problemSlugs: ['bit-lanterns'], resources: [],
                    content: `## Reason before looping
To test divisibility, use remainder. Euclid's algorithm repeatedly replaces (a, b) with (b, a % b); gcd(84, 30) becomes gcd(30, 24), then gcd(24, 6), then 6. Testing divisors only up to the square root is sufficient because every divisor larger than the square root has a smaller partner. For many prime queries up to N, a sieve marks multiples in O(N log log N) time with O(N) memory.

A mask stores several Boolean states in one non-negative integer. Bit k is tested with n & (1 << k), set with n | (1 << k), and toggled with n ^ (1 << k). Number bits from zero. Binary 1101 represents 13 and has three set bits.

## Worked example: remove one lit bit
Subtracting one flips the lowest set bit and the zero bits below it. Therefore n & (n - 1) removes exactly that set bit.

\`\`\`python
def lit_count(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count

print(lit_count(13))  # 3: 13 -> 12 -> 8 -> 0
\`\`\`

The loop runs once per set bit: O(popcount(n)) time and constant auxiliary storage under a fixed-width model. In Python, arbitrary-width integer operations depend on the number of digits. Fast exponentiation repeatedly squares a base and processes exponent bits in O(log exponent) multiplications. Apply the modulus after each multiplication to keep intermediate values bounded; modular division requires an inverse and cannot be replaced blindly with integer division.

## Common errors and checkpoint
Python's ~n includes infinitely many leading sign bits; use a mask such as (1 << width) - 1 when a fixed width is required. The power-of-two test n & (n - 1) == 0 also accepts zero unless n > 0 is checked. Submit Bit Lanterns, trace 0, 8, and 15, and write Euclid's algorithm yourself. Explain why trial division needs no divisor above the square root.`,
                }],
        },
        {
            slug: 'arrays-and-matrices', title: '3. Arrays and matrices',
            description: 'Indices, in-place transformations, matrix coordinates, and dimension boundaries.',
            lessons: [{
                    slug: 'index-and-coordinate-invariants', title: 'Indices are part of the proof', estimatedMinutes: 30,
                    summary: 'Use clear index ranges to traverse and transform one- and two-dimensional data.',
                    problemSlugs: ['ledger-total'], resources: [],
                    content: `## An array is a coordinate system
Python lists provide O(1) indexed access, amortized O(1) append, and O(n) insertion near the beginning because entries must move. For in-place transformations, state which part is already correct. Reversing a list with two pointers preserves the invariant that entries outside the interval [left, right] are in their final positions.

A matrix uses a pair (row, column). Keep row count and column count separate: many bugs hide when all examples happen to be square. Valid coordinates satisfy 0 <= row < rows and 0 <= column < columns. Four-direction neighbors add (-1, 0), (1, 0), (0, -1), or (0, 1).

## Worked example: transpose a rectangular matrix
Transposition maps entry (r, c) to (c, r). A 2-by-3 input must produce a 3-by-2 result.

\`\`\`python
def transpose(matrix):
    if not matrix:
        return []
    rows, cols = len(matrix), len(matrix[0])
    result = [[0 for _ in range(rows)] for _ in range(cols)]
    for r in range(rows):
        for c in range(cols):
            result[c][r] = matrix[r][c]
    return result

print(transpose([[1, 2, 3], [4, 5, 6]]))
# [[1, 4], [2, 5], [3, 6]]
\`\`\`

This visits all R*C cells in O(R*C) time and allocates O(R*C) space. A square matrix can be transposed in place by swapping only cells above the diagonal; applying that technique to a rectangular matrix is a different problem. Rotating a square matrix clockwise can be decomposed into transpose plus row reversal.

## Common errors and checkpoint
Avoid [[0] * cols] * rows: each row aliases the same list. Check empty input before reading matrix[0]. A slice such as a[left:right] excludes right and creates a copy, which changes space costs. Revisit Ledger Total as a row-total helper, then implement matrix row sums, transpose, and boundary traversal. Test a single row, a single column, and a 2-by-3 matrix; explain the output dimensions before running your code.`,
                }],
        },
        {
            slug: 'hashing-and-strings', title: '4. Hash tables and string fundamentals',
            description: 'Counting, membership, duplicates, immutable strings, and collision-aware reasoning.',
            lessons: [{
                    slug: 'count-search-and-build', title: 'Count, look up, and build strings', estimatedMinutes: 35,
                    summary: 'Trade memory for fast lookup while preserving the output contract.',
                    problemSlugs: ['parcel-frequencies', 'signal-reverse'],
                    resources: [{ title: 'collections.Counter', url: 'https://docs.python.org/3/library/collections.html#collections.Counter', kind: 'reading' }],
                    content: `## Store the question you will ask again
If a solution repeatedly scans earlier values to ask whether a value occurred, store membership in a set. If it asks how often a value occurred, use a dictionary of counts. Hash tables usually provide expected O(1) lookup and insertion, although their worst case is not guaranteed constant. Keys must be hashable: tuples of immutable items work, lists do not.

For Parcel Frequencies, counting is linear, but the required increasing output order adds a sorting step. If n entries contain k distinct values, the total cost is O(n + k log k), with O(k) auxiliary storage. Do not call the complete solution O(n) while ignoring its output ordering.

## Worked example: anagram inventory
Two words are anagrams exactly when their character counts match; merely having the same set of characters is insufficient.

\`\`\`python
def inventory(word):
    counts = {}
    for char in word:
        counts[char] = counts.get(char, 0) + 1
    return counts

print(inventory("abb") == inventory("bab"))  # True
print(inventory("abb") == inventory("aab"))  # False
\`\`\`

Counting both strings takes O(n + m) expected time and space proportional to distinct characters. Python strings are immutable; build many pieces in a list and join them instead of repeatedly concatenating growing results. Decide from the statement whether case, spaces, and Unicode matter. Signal Reverse preserves spaces and reverses Python characters; language-specific grapheme clusters are a separate requirement.

## Common errors and checkpoint
An unchecked dictionary access raises KeyError. A set loses duplicate counts and should not be substituted for an inventory. Do not sort a dictionary and assume it has modified itself. Submit both problems; test repeated characters, all unique values, an empty input, and negative numeric keys. As an extension, find the first character with frequency one using one counting pass and one pass in original order.`,
                }],
        },
        {
            slug: 'sorting', title: '5. Sorting and divide-and-conquer',
            description: 'Comparison rules, stability, merge sort, quicksort, and counting sort.',
            lessons: [{
                    slug: 'order-enables-algorithms', title: 'Sort to expose structure', estimatedMinutes: 40,
                    summary: 'Choose a sorting method and understand the work it enables afterward.',
                    problemSlugs: ['sorted-manifest'],
                    resources: [{ title: 'Python sorting HOWTO', url: 'https://docs.python.org/3/howto/sorting.html', kind: 'reading' }],
                    content: `## Ordering changes the problem
Sorting places equal values together and lets adjacent comparisons replace global searches. A scan can detect duplicates, merge intervals, or run two pointers once the input is ordered. Include the sorting cost when evaluating the whole algorithm. Python's sorted returns a new list; list.sort changes the existing list. Both are stable, meaning entries with equal keys retain their relative order.

Comparison sorting generally needs O(n log n) comparisons in the worst case. Merge sort splits the sequence, sorts each half, and merges the two sorted results. Its merge invariant is that the output contains the smallest processed entries in order.

## Worked example: the merge step

\`\`\`python
def merge(left, right):
    i = j = 0
    result = []
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print(merge([1, 4], [2, 4, 7]))  # [1, 2, 4, 4, 7]
\`\`\`

Merging lengths a and b costs O(a + b) time and space; all merge-sort levels together cost O(n log n) time and O(n) auxiliary storage. Quicksort partitions around a pivot and typically runs in O(n log n), but poor pivots can cause O(n^2) work. Counting sort is useful when integer keys lie in a small known range, with O(n + range) cost; it is not a universal replacement.

## Common errors and checkpoint
Use a key function for multiple criteria, such as key=lambda item: (item[1], item[0]). Reversing the entire key order may reverse tie handling unintentionally. In a stable merge, choose the left entry on equality. Submit Sorted Manifest and implement merge sort independently. Test duplicates, an already sorted list, reverse order, and an empty list; explain which methods need extra storage.`,
                }],
        },
        {
            slug: 'pointer-window-prefix', title: '6. Two pointers, windows, and prefix sums',
            description: 'Reduce repeated range work using monotone movement and cumulative state.',
            lessons: [{
                    slug: 'reuse-neighboring-work', title: 'Reuse work between neighboring ranges', estimatedMinutes: 45,
                    summary: 'Choose a prefix sum, two pointers, or sliding window based on the invariant.',
                    problemSlugs: ['range-ledger', 'warm-window'], resources: [],
                    content: `## Three related tools, three different contracts
A prefix sum stores p[i] = sum(a[:i]), with p[0] = 0. The inclusive range [left, right] totals p[right + 1] - p[left]. Building p costs O(n) time and space, then each static range query costs O(1). Prefix sums become less convenient when entries change frequently; the range-query module addresses that case.

Two pointers work when moving one boundary makes predictable progress. In a sorted array, if a[left] + a[right] is too small, increasing left is the only movement that can increase that sum while keeping right. A variable-length sliding window needs a similar monotonic property. For example, shrinking a window of non-negative values never increases its sum; negative values invalidate that particular argument.

## Worked example: fixed-length window
The window [2, -1, 5] totals 6. Shifting right removes 2 and adds -2, producing total 2 without summing all three values again.

\`\`\`python
def best_window(values, k):
    current = sum(values[:k])
    best = current
    for right in range(k, len(values)):
        current += values[right] - values[right - k]
        best = max(best, current)
    return best

print(best_window([2, -1, 5, -2, 3], 3))  # 6
\`\`\`

The loop maintains the sum of exactly k current entries and runs in O(n) time with O(1) auxiliary space. A variable-size window for longest unique substring keeps character counts, advances right once per entry, and advances left until uniqueness returns. Since each pointer advances at most n times, its total work is linear despite the nested while loop.

## Common errors and checkpoint
Initialize best from a valid window, not zero, because every valid sum may be negative. Clarify whether range endpoints are inclusive. Avoid slicing every candidate window, which adds repeated copying. Submit both practice problems. Then solve two-sum on a sorted list with two pointers and explain why the same rule does not apply to an unsorted list.`,
                }],
        },
        {
            slug: 'binary-search', title: '7. Binary search and search on answers',
            description: 'Boundary conventions, lower bounds, rotated arrays, and monotone feasibility.',
            lessons: [{
                    slug: 'find-a-boundary', title: 'Find the first true position', estimatedMinutes: 40,
                    summary: 'Use one consistent half-open interval to avoid off-by-one errors.',
                    problemSlugs: ['beacon-search'],
                    resources: [{ title: 'Python bisect', url: 'https://docs.python.org/3/library/bisect.html', kind: 'reading' }],
                    content: `## Search a transition, not a sample
Binary search needs an ordered search space. To find the first array entry greater than or equal to target, maintain a half-open interval [low, high). Entries before low are too small, and entries at or after high are known candidates. At termination low == high is the insertion boundary; it may equal len(values).

## Worked example: first occurrence
For [1, 3, 3, 8] and target 3, finding any matching element is insufficient: the required answer is index 1. A lower-bound search finds that first occurrence.

\`\`\`python
def lower_bound(values, target):
    low, high = 0, len(values)
    while low < high:
        mid = (low + high) // 2
        if values[mid] < target:
            low = mid + 1
        else:
            high = mid
    return low

values = [1, 3, 3, 8]
index = lower_bound(values, 3)
print(index if index < len(values) and values[index] == 3 else -1)
\`\`\`

Each step removes about half the remaining interval: O(log n) time and O(1) space. Search on answers applies the same idea to a monotone feasibility predicate. To minimize a daily shipping capacity for positive weights and D days, greedily count days for a candidate capacity. If capacity C works, all larger capacities work. Search from max(weights) to sum(weights); each feasibility check is O(n), so the total is O(n log(sum(weights))). State the monotonicity before writing the loop.

## Common errors and checkpoint
Do not mix high = len(values) with a loop intended for an inclusive high index. Every branch must shorten the interval. A returned insertion index still needs an equality check. Rotated sorted arrays need reasoning about which side remains ordered; duplicates can remove the clean halving guarantee. Submit Beacon Search, test missing targets on both sides and repeated targets, then write the shipping feasibility predicate without binary search before combining them.`,
                }],
        },
        {
            slug: 'linked-lists', title: '8. Linked lists',
            description: 'Node ownership, pointer changes, dummy nodes, cycles, and fast/slow pointers.',
            lessons: [{
                    slug: 'preserve-the-next-link', title: 'Change links without losing nodes', estimatedMinutes: 35,
                    summary: 'Reverse a chain and learn why operation order matters.',
                    problemSlugs: ['chain-splice'], resources: [],
                    content: `## A linked list stores the route to the next value
An array locates an entry by index; a singly linked list locates the next entry through a node reference. Reaching position k therefore costs O(k). Inserting after a node you already hold takes O(1), but finding that node may still be linear. A node should have a value and a next reference; None marks the end.

Reversal changes edges, not values. Keep three roles distinct: previous is the already reversed prefix, current starts the remaining original suffix, and following saves the next node before its link is overwritten. Together the two chains contain every original node exactly once.

## Worked example: reverse 4 -> 7 -> 2

\`\`\`python
class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def reverse(head):
    previous = None
    current = head
    while current is not None:
        following = current.next
        current.next = previous
        previous = current
        current = following
    return previous

head = Node(4, Node(7, Node(2)))
head = reverse(head)  # 2 -> 7 -> 4
\`\`\`

The algorithm visits n nodes in O(n) time with O(1) extra references. Dummy nodes simplify insertion and deletion at the head by providing a stable predecessor. For cycle detection, advance a slow pointer by one edge and a fast pointer by two. If they meet, a cycle exists; if fast reaches None, there is no cycle. Fast/slow pointers can also locate the middle, but define which middle is desired for even length.

## Common errors and checkpoint
Saving current.next after overwriting it loses the unreversed suffix. Returning the original head returns the new tail. Never assume head or head.next exists. The judge verifies observable answers; it cannot enforce a particular internal data structure, so implement real nodes for this exercise. Submit Chain Splice, draw each pointer after every iteration, and test empty, singleton, and two-node chains. Extend your node class with a dummy-head deletion routine.`,
                }],
        },
        {
            slug: 'stacks-and-queues', title: '9. Stacks, queues, and monotonic structures',
            description: 'LIFO/FIFO rules, parentheses, next-greater queries, and amortized analysis.',
            lessons: [{
                    slug: 'pending-work-and-order', title: 'Store unresolved work in the right order', estimatedMinutes: 40,
                    summary: 'Use a stack for nested work and a queue for discovery order.',
                    problemSlugs: ['balanced-crates', 'next-beacon'],
                    resources: [{ title: 'collections.deque', url: 'https://docs.python.org/3/library/collections.html#collections.deque', kind: 'reading' }],
                    content: `## Choose the order of removal
A stack removes the most recently added item, making it useful for nested expressions, undo, and iterative DFS. A queue removes the earliest item, which supports BFS layers and fair processing. Python list append/pop implement stack operations; deque append/popleft implement a queue without shifting all remaining entries.

Round-bracket balance can use a counter because there is only one bracket type: every prefix must have non-negative balance, and the final balance must be zero. With multiple bracket types, a stack of opening types is needed; a count alone would incorrectly accept ([)].

## Worked example: next strictly greater entry
Store indices whose next greater entry is unresolved. Their heights are non-increasing. When a taller value arrives, it resolves every smaller height on top.

\`\`\`python
def next_greater_indices(heights):
    answer = [-1] * len(heights)
    pending = []
    for index, height in enumerate(heights):
        while pending and heights[pending[-1]] < height:
            answer[pending.pop()] = index
        pending.append(index)
    return answer

print(next_greater_indices([3, 1, 4, 2, 5]))
# [2, 2, 4, 4, -1]
\`\`\`

Each index is pushed once and popped at most once, so the nested loop performs O(n) total operations and uses O(n) storage. This is amortized analysis: an individual iteration may do much work, but total work is bounded. A monotonic deque extends the idea to sliding-window maxima by discarding expired indices at the front and dominated candidates at the back.

## Common errors and checkpoint
Store indices when the answer needs positions or expiry checks. Decide whether equality should pop; Next Beacon asks for strictly greater heights. list.pop(0) makes repeated queue removals expensive. Submit both exercises and trace increasing, decreasing, and equal-height arrays. Implement a window maximum next, explaining why a removed smaller candidate can never become useful again.`,
                }],
        },
        {
            slug: 'recursion-and-backtracking', title: '10. Recursion and backtracking',
            description: 'Call frames, base cases, decision trees, state restoration, and pruning proofs.',
            lessons: [{
                    slug: 'decision-trees', title: 'Explore a decision tree completely', estimatedMinutes: 45,
                    summary: 'Enumerate choices safely, then prune only when a proof permits it.',
                    problemSlugs: ['bundle-subsets'], resources: [],
                    content: `## Give each call one responsibility
A recursive function needs a state, a base case, and transitions that make progress toward the base case. To count subsets, let count(i, total) mean the number of valid completions after deciding positions before i. The next position has two independent choices: skip it or take it. At i == n, return one exactly when total equals the target.

This counts positions rather than distinct value combinations. For [0, 0] and target 0, all four subsets qualify. For [-1, 1, 2] and target 1, both {1} and {-1, 2} qualify.

## Worked example

\`\`\`python
def subset_count(values, target):
    def visit(index, total):
        if index == len(values):
            return int(total == target)
        return (visit(index + 1, total)
                + visit(index + 1, total + values[index]))
    return visit(0, 0)

print(subset_count([1, 2, 3], 3))  # 2
\`\`\`

There are 2^n leaves and O(2^n) total calls, with O(n) maximum call-stack depth. When constructing actual answers, append a choice, recurse, then pop it; copy the path when saving an answer. The same choose/explore/undo pattern builds permutations and solves constraint problems such as N-Queens. Duplicate values may require sorting and skipping equivalent choices when unique value combinations are requested.

## Common errors and checkpoint
Do not stop just because total exceeds target when negative values are allowed: later choices can reduce it. A return inside a choice loop may skip other branches. Appending the same mutable path object to every answer makes all answers change together. Python recursion depth is limited; use an explicit stack for very deep chains rather than raising the limit blindly. Submit Bundle Subsets, draw its decision tree for [1, 2], and identify a valid pruning rule only under an explicit non-negative-values assumption.`,
                }],
        },
        {
            slug: 'greedy-and-intervals', title: '11. Greedy algorithms and intervals',
            description: 'Exchange arguments, interval selection, interval merging, and counterexamples.',
            lessons: [{
                    slug: 'prove-the-local-choice', title: 'Prove the local choice is safe', estimatedMinutes: 40,
                    summary: 'Justify a greedy choice instead of treating plausible sorting as a proof.',
                    problemSlugs: ['meeting-docks'], resources: [],
                    content: `## A greedy rule needs a reason
Greedy algorithms commit to a choice and never revisit it. They work when some optimal answer can be transformed to begin with that choice without becoming worse. To maximize the number of non-overlapping bookings, choose the available booking that ends earliest, not the one that starts earliest or has shortest duration.

For the exchange argument, take an optimal schedule and replace its first booking with the earliest-finishing booking. The replacement finishes no later, so every remaining booking stays feasible. Repeat the argument on the remaining interval. This proves the rule by reducing the problem after each choice.

## Worked example
For bookings [1,4), [2,3), [3,5), [5,6), selecting [2,3), then [3,5), then [5,6) gives three bookings. Half-open intervals allow one booking to start exactly at the prior end.

\`\`\`python
def most_bookings(bookings):
    end = None
    count = 0
    for start, finish in sorted(bookings, key=lambda item: item[1]):
        if end is None or start >= end:
            count += 1
            end = finish
    return count
\`\`\`

Sorting costs O(n log n); scanning costs O(n). Merging overlapping intervals uses a different ordering: sort by start, then extend the current end when the next interval overlaps. Greedy coin selection does not work for every coin system: with coins 1, 3, 4, choosing 4 for total 6 needs three coins, while 3 + 3 needs two. Dynamic programming handles the general case.

## Common errors and checkpoint
Define whether touching endpoints overlap before choosing >= or >. Optimizing booking count differs from optimizing total booking value; the weighted version needs a different algorithm. A few passing examples do not establish correctness. Submit Meeting Docks and give the exchange argument in your own words. Construct counterexamples to earliest-start and shortest-duration rules, then implement interval merging as a separate exercise.`,
                }],
        },
        {
            slug: 'heaps', title: '12. Heaps and priority queues',
            description: 'Partial ordering, top-k, multiway merging, and stale priority entries.',
            lessons: [{
                    slug: 'retain-the-best-candidates', title: 'Retain only useful candidates', estimatedMinutes: 35,
                    summary: 'Keep a bounded heap rather than repeatedly sorting all values.',
                    problemSlugs: ['kth-supply'],
                    resources: [{ title: 'Python heapq', url: 'https://docs.python.org/3/library/heapq.html', kind: 'reading' }],
                    content: `## A heap does not sort the whole collection
A binary min-heap ensures each parent is no larger than its children. Only the smallest item is immediately available; siblings and unrelated subtrees are not globally ordered. Peeking costs O(1), insertion and removal cost O(log n), and bottom-up heap construction costs O(n). Python heapq operates on an ordinary list.

To find the kth largest value, keep a min-heap of the k largest values seen so far. Its root is the weakest retained candidate. A new value no larger than the root cannot improve the retained set once the heap is full. Duplicate values still represent separate entries.

## Worked example
For [8, 2, 8, 5, 3] with k = 3, the final retained values are 5, 8, 8 and the answer is 5.

\`\`\`python
import heapq

def kth_largest(values, k):
    kept = []
    for value in values:
        if len(kept) < k:
            heapq.heappush(kept, value)
        elif value > kept[0]:
            heapq.heapreplace(kept, value)
    return kept[0]
\`\`\`

The bounded heap uses O(k) space and O(n log(k + 1)) time. To merge k sorted streams, hold one current item per stream and replenish the stream whose item is removed. To simulate a max-heap on Python versions without a max-heap API, store negated numeric priorities. Tuples such as (priority, sequence_number, item) handle ties without comparing arbitrary objects.

## Common errors and checkpoint
Index zero is the only guaranteed minimum; iterating the heap is not sorted output. Changing a priority in place breaks the invariant unless the heap is repaired. Algorithms such as Dijkstra often push an improved entry and ignore obsolete entries later rather than editing the heap. Submit Kth Supply, test k = 1, k = n, all duplicates, and negative values. Explain why a max-heap of all n values solves the task with a different memory tradeoff.`,
                }],
        },
        {
            slug: 'trees-and-bsts', title: '13. Binary trees and binary search trees',
            description: 'Traversal orders, recursive summaries, BST bounds, balancing, and ancestor queries.',
            lessons: [{
                    slug: 'summarize-a-subtree', title: 'Return the summary a parent needs', estimatedMinutes: 45,
                    summary: 'Use recursive structure for height, traversal, search, and validation.',
                    problemSlugs: ['tree-height-log'], resources: [],
                    content: `## Trees are smaller trees joined at a root
For each recursive algorithm, decide what a call returns for its subtree. Height in nodes is zero for an empty subtree and one plus the larger child height otherwise. Preorder visits root before children, inorder visits between children, and postorder visits after children. BFS visits one depth at a time using a queue.

Tree Height Log uses heap-position encoding: children of index i are at 2*i+1 and 2*i+2. This differs from a compact level-order encoding that omits children of missing nodes. Follow the statement's representation, and ignore descendants below a null entry.

## Worked example: validate a strict BST
Checking only a node and its immediate children is insufficient. Every descendant must respect bounds inherited from all ancestors.

\`\`\`python
def valid_bst(node, low=float("-inf"), high=float("inf")):
    if node is None:
        return True
    if not low < node.value < high:
        return False
    return (valid_bst(node.left, low, node.value)
            and valid_bst(node.right, node.value, high))
\`\`\`

This checks n nodes in O(n) time with O(h) call-stack space. A strict BST rejects duplicates; other contracts may allow them on one side. Search, insertion, and deletion take O(h), which is O(log n) only when height is balanced; an ordinary BST may degenerate to a chain. Deleting a node with two children can replace its value with the inorder successor and then remove that successor.

For lowest common ancestor in a BST, use key ordering to move toward the split point. For many ancestor queries in a general tree, binary lifting precomputes 2^j ancestors in O(n log n) space/time and answers each query in O(log n).

## Common errors and checkpoint
Distinguish height in edges from height in nodes. Validate global bounds and define duplicate handling. Deep trees may need iterative traversal in Python. Submit Tree Height Log; then implement all three DFS orders, strict BST validation, and an LCA query. Include a tree whose left subtree contains a value larger than the root.`,
                }],
        },
        {
            slug: 'tries', title: '14. Tries and prefix search',
            description: 'Character paths, terminal markers, prefix counts, and alphabet tradeoffs.',
            lessons: [{
                    slug: 'share-common-prefixes', title: 'Share common prefixes explicitly', estimatedMinutes: 35,
                    summary: 'Build a prefix index that distinguishes complete words from traversable paths.',
                    problemSlugs: ['prefix-depot'], resources: [],
                    content: `## Paths encode prefixes
A trie stores a word by following one edge per character. Labels forge, forest, and form share the path f -> o -> r. A node's existence means a prefix exists; it does not mean that prefix was inserted as a complete word. Store a terminal count when complete-word lookup is required and a pass count when prefix-frequency lookup is required.

For Prefix Depot, increment the root count for every inserted word, including the empty word. Then increment each node along the word's path. The root count answers the empty-prefix query. Duplicated labels increase counts independently.

## Worked example

\`\`\`python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.count = 0

def insert(root, word):
    node = root
    node.count += 1
    for char in word:
        if char not in node.children:
            node.children[char] = TrieNode()
        node = node.children[char]
        node.count += 1

def prefix_count(root, prefix):
    node = root
    for char in prefix:
        if char not in node.children:
            return 0
        node = node.children[char]
    return node.count
\`\`\`

Insertion and query take O(L) expected time for length L using dictionary children. Space is O(total inserted characters) in the worst case. A fixed child array can reduce lookup overhead for a small alphabet but allocates many unused slots. A compressed radix trie merges one-child paths to reduce nodes. Bitwise tries use binary digits instead of characters and can support maximum-XOR queries.

## Common errors and checkpoint
Do not confuse prefix existence with complete-word existence. Empty words and empty queries need explicit handling at the root. Deletion must decrease counts only when the word actually exists and must preserve paths used by other words. Submit Prefix Depot and test duplicate labels, a query longer than every label, and an empty query. Add a terminal count, then explain how complete-word search differs from prefix counting.`,
                }],
        },
        {
            slug: 'graph-traversal', title: '15. Graph representations, BFS, and DFS',
            description: 'Adjacency lists, connected components, unweighted distances, and grid graphs.',
            lessons: [{
                    slug: 'discover-once', title: 'Discover each vertex once', estimatedMinutes: 45,
                    summary: 'Separate reachability from shortest paths and choose the right traversal.',
                    problemSlugs: ['hop-map', 'island-links'], resources: [],
                    content: `## Model vertices and edges first
A graph may be directed or undirected, weighted or unweighted, connected or disconnected. An adjacency list uses O(V + E) storage and supports visiting neighbors efficiently. Add both directions for an undirected edge. A matrix uses O(V^2) storage and can be appropriate for dense graphs or constant-time edge queries.

BFS discovers vertices in nondecreasing number of edges from the source, making it a shortest-path algorithm for unweighted graphs. Mark a vertex when enqueuing it so several parents do not enqueue it repeatedly. DFS explores a branch before backtracking and is useful for components and structural questions; the first DFS route is not generally the shortest route.

## Worked example: distances from one source

\`\`\`python
from collections import deque

def distances(graph, source):
    distance = [-1] * len(graph)
    distance[source] = 0
    queue = deque([source])
    while queue:
        vertex = queue.popleft()
        for neighbor in graph[vertex]:
            if distance[neighbor] == -1:
                distance[neighbor] = distance[vertex] + 1
                queue.append(neighbor)
    return distance
\`\`\`

With adjacency lists, traversal takes O(V + E) time and O(V) additional storage. For all connected components, start a traversal from every still-unvisited vertex, including isolated vertices. A rectangular grid is an implicit graph: generate valid neighboring cells rather than storing every edge. Multi-source BFS initializes several sources at distance zero to find distance to the nearest source.

## Common errors and checkpoint
An unreachable distance is not zero; reserve a distinct sentinel. A single-source traversal does not inspect every disconnected component. For undirected cycle detection, account for the parent edge rather than treating every visited neighbor as a cycle. Submit Hop Map and Island Links, then compare iterative DFS and BFS on the same cyclic graph. Test self-loops, duplicate edges, and isolated vertices.`,
                }],
        },
        {
            slug: 'directed-graphs', title: '16. Directed graphs and dependency order',
            description: 'Topological sorting, cycle detection, SCCs, and dependency dynamic programming.',
            lessons: [{
                    slug: 'release-ready-tasks', title: 'Release tasks when prerequisites disappear', estimatedMinutes: 40,
                    summary: 'Use indegrees to produce a valid dependency order and detect cycles.',
                    problemSlugs: ['task-order'], resources: [],
                    content: `## Dependencies define a partial order
An edge u -> v means u must appear before v. A directed acyclic graph has a topological order; a directed cycle makes a complete order impossible. Kahn's algorithm counts incoming edges, processes a zero-indegree vertex, and removes its outgoing edges. Removing an edge may release a new zero-indegree vertex.

If multiple tasks are ready, a normal queue gives some valid order. Task Order requires the lexicographically smallest order, so use a min-heap of ready task IDs. Choosing the smallest available ID is safe because it cannot violate any remaining prerequisite and makes the earliest undecided output position as small as possible.

## Worked example

\`\`\`python
import heapq

def task_order(graph, indegree):
    ready = [v for v, degree in enumerate(indegree) if degree == 0]
    heapq.heapify(ready)
    result = []
    while ready:
        vertex = heapq.heappop(ready)
        result.append(vertex)
        for neighbor in graph[vertex]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                heapq.heappush(ready, neighbor)
    return result if len(result) == len(graph) else None
\`\`\`

Queue-based topological sorting takes O(V + E); heap tie-breaking takes O(E + V log V). A DFS alternative uses three states: unseen, active, and finished. An edge to an active vertex identifies a directed cycle. Strongly connected components group vertices mutually reachable from one another; Kosaraju or Tarjan computes them in O(V + E). Contracting SCCs always produces a DAG, where topological dynamic programming can count paths or find longest paths with suitable weights.

## Common errors and checkpoint
Do not use undirected parent-based cycle rules on a directed graph. Seeing a previously finished vertex is not itself a cycle. A partial output means failure when all tasks are required. Submit Task Order, including a self-loop and a disconnected DAG. Trace indegrees after every removal, and explain why using a queue might violate the lexicographic requirement even while respecting dependencies.`,
                }],
        },
        {
            slug: 'weighted-paths', title: '17. Weighted shortest paths',
            description: 'Relaxation, Dijkstra, 0–1 BFS, Bellman–Ford, and all-pairs distances.',
            lessons: [{
                    slug: 'relaxation-and-finality', title: 'Improve a distance only with evidence', estimatedMinutes: 45,
                    summary: 'Choose a shortest-path algorithm based on edge-weight assumptions.',
                    problemSlugs: ['courier-distances'], resources: [],
                    content: `## A distance is a best-known bound
Relaxing edge u -> v with weight w means checking whether distance[u] + w improves distance[v]. Dijkstra repeatedly removes the smallest tentative distance. With non-negative edges, no later route can improve that removed vertex through a larger tentative distance. This finality argument fails for negative edges.

Python heaps do not need a decrease-key operation here: push every improvement and skip obsolete entries when removed. For directed roads, add only the stated direction. Zero-cost roads are valid under Dijkstra, and repeated roads require no special deduplication.

## Worked example
Roads 0 -> 1 costing 8, 0 -> 2 costing 2, and 2 -> 1 costing 1 improve distance[1] from 8 to 3.

\`\`\`python
import heapq

def dijkstra(graph, source):
    distance = [float("inf")] * len(graph)
    distance[source] = 0
    pending = [(0, source)]
    while pending:
        cost, vertex = heapq.heappop(pending)
        if cost != distance[vertex]:
            continue
        for neighbor, weight in graph[vertex]:
            candidate = cost + weight
            if candidate < distance[neighbor]:
                distance[neighbor] = candidate
                heapq.heappush(pending, (candidate, neighbor))
    return distance
\`\`\`

With lazy heap entries, a general bound is O((V + E) log(V + E)) time and O(V + E) storage. For weights restricted to zero or one, a deque-based 0–1 BFS takes O(V + E). Bellman–Ford handles negative edges in O(VE) and detects reachable negative cycles by an additional relaxation pass. Floyd–Warshall computes all-pairs distances in O(V^3) time and O(V^2) space for smaller dense graphs.

## Common errors and checkpoint
Do not mark a node finished when first inserted into the heap. Distinguish an unreachable vertex from one reached at cost zero. A negative cycle can mean no finite shortest answer for affected destinations. Submit Courier Distances, test a cheaper indirect route, and explain why ordinary BFS chooses by number of edges rather than total weight.`,
                }],
        },
        {
            slug: 'disjoint-sets-and-mst', title: '18. Disjoint sets and spanning trees',
            description: 'Connectivity representatives, union by size, Kruskal, Prim, and cut arguments.',
            lessons: [{
                    slug: 'merge-components-safely', title: 'Merge components without creating cycles', estimatedMinutes: 45,
                    summary: 'Use a disjoint-set structure to build a minimum-cost connecting tree.',
                    problemSlugs: ['island-links', 'cable-budget'], resources: [],
                    content: `## Connectivity can be maintained without storing every route
A disjoint-set union structure represents each component by a root. Find returns that representative; union merges two different components. Path compression shortens future finds, and union by size attaches the smaller tree beneath the larger. Together they give nearly constant amortized work per operation, conventionally O(alpha(n)). They support adding connections efficiently, but do not directly support arbitrary edge deletion.

Kruskal sorts undirected edges by weight and accepts an edge only when its endpoints currently belong to different components. Each accepted edge reduces the component count by one. A connected graph with n vertices needs exactly n - 1 accepted edges in its spanning tree.

## Worked example: union operation

\`\`\`python
parent = list(range(5))
size = [1] * 5

def find(vertex):
    while parent[vertex] != vertex:
        parent[vertex] = parent[parent[vertex]]
        vertex = parent[vertex]
    return vertex

def union(first, second):
    first, second = find(first), find(second)
    if first == second:
        return False
    if size[first] < size[second]:
        first, second = second, first
    parent[second] = first
    size[first] += size[second]
    return True
\`\`\`

Why does the cheapest connecting edge work? For the cut separating one current component from the rest, a cheapest crossing edge can belong to some MST: adding it to another spanning tree creates a cycle, from which a no-cheaper crossing edge can be removed. Sorting dominates Kruskal at O(E log E). Prim instead grows one tree using a frontier of cheapest connecting edges.

## Common errors and checkpoint
MST minimizes total connection cost, whereas shortest paths minimize routes from a source; these are different objectives. Ignore self-loops and reject edges within one component. A disconnected graph has a minimum spanning forest, but Cable Budget specifically requires connectivity and returns -1 otherwise. Submit both problems and trace representative changes. Test parallel cables and the zero-vertex boundary explicitly.`,
                }],
        },
        {
            slug: 'dp-foundations-and-grids', title: '19. Dynamic programming foundations and grids',
            description: 'States, transitions, base cases, memoization, tabulation, and rolling memory.',
            lessons: [{
                    slug: 'state-before-table', title: 'Define the state before the table', estimatedMinutes: 45,
                    summary: 'Reuse overlapping subproblems and prove the evaluation order.',
                    problemSlugs: ['stairway-routes', 'grid-deliveries'], resources: [],
                    content: `## A table is useful only after its meaning is clear
Dynamic programming reuses answers to overlapping subproblems. Start by writing a sentence for the state, then enumerate the final choice. For stairways, ways[s] counts routes to step s; the last move came from s - 1 or s - 2. Set ways[0] = 1 because doing nothing is one valid way to complete zero steps.

For a grid, ways[r][c] counts valid routes ending at that free cell. The last move comes from above or left, so add those counts. Blocked cells have zero routes. The top-left free cell starts with one route. Tabulation evaluates dependencies first; memoization computes states on demand and caches them.

## Worked example: rolling grid row

\`\`\`python
def routes(grid):
    if not grid:
        return 0
    ways = [0] * len(grid[0])
    ways[0] = 1
    for row in grid:
        for column, blocked in enumerate(row):
            if blocked:
                ways[column] = 0
            elif column > 0:
                ways[column] += ways[column - 1]
    return ways[-1]

print(routes([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))  # 2
\`\`\`

Before updating a free cell, ways[column] still holds the count from above, while ways[column - 1] already holds the count from the current row's left neighbor. This dependency order explains the in-place update. The algorithm takes O(R*C) time and O(C) auxiliary space. Rolling storage is suitable when only the count is needed; reconstructing a route may require parent decisions or a larger table.

## Common errors and checkpoint
Do not let a blocked start retain its initial one. A missing state and a state with zero solutions are different concepts in memoization. Apply a modulus only when the statement requests one; these exercises require exact counts. Submit both tasks, derive their recurrences without looking at code, and compare memoized and tabulated stairway implementations.`,
                }],
        },
        {
            slug: 'dp-patterns', title: '20. Knapsack, subsequences, strings, and advanced DP',
            description: '0/1 versus unbounded choices, LCS, LIS, edit distance, interval/tree/digit/bitmask DP.',
            lessons: [{
                    slug: 'choose-state-and-update-order', title: 'Choose a state and preserve its dependencies', estimatedMinutes: 55,
                    summary: 'Recognize common DP families without memorizing an unexplained table.',
                    problemSlugs: ['pack-value', 'common-log'], resources: [],
                    content: `## Capacity and prefix states
In 0/1 knapsack, best[i][c] is the best value using the first i parcels within capacity c. Either skip parcel i or take it once from a state using earlier parcels. A one-dimensional table must scan capacities downward so the current parcel cannot be reused. Unbounded knapsack scans upward because reuse is intended. This direction difference follows from the state meaning.

## Worked example: take each parcel at most once

\`\`\`python
def pack(items, capacity):
    best = [0] * (capacity + 1)
    for weight, value in items:
        for limit in range(capacity, weight - 1, -1):
            best[limit] = max(best[limit], best[limit - weight] + value)
    return best[capacity]

print(pack([(2, 5), (3, 8), (4, 9)], 5))  # 13
\`\`\`

This is O(n*capacity) time and O(capacity) space, a pseudo-polynomial cost because capacity is a numeric value rather than its encoded length. For LCS, state L[i][j] is the longest common subsequence length of prefixes a[:i] and b[:j]. Equal final characters allow 1 + L[i-1][j-1]; otherwise skip one side using max(L[i-1][j], L[i][j-1]). Time is O(nm), and rolling rows reduce length-only storage to O(m). A subsequence may skip characters; a substring must be contiguous.

## Map advanced variants to states
LIS can use dp[i] for the best increasing subsequence ending at i in O(n^2), or maintain minimum tails with binary search in O(n log n). Edit distance adds insertion, deletion, and replacement transitions between prefix states. Interval DP uses dp[left][right] and tries a split, as in matrix-chain multiplication. Tree DP returns summaries such as best values when a node is taken or skipped. Bitmask DP tracks a visited subset, often O(2^n * n^2). Digit DP tracks digit position, tightness to a bound, and a property state. These are state designs, not one interchangeable template.

## Common errors and checkpoint
Scanning 0/1 capacities upward may use one parcel repeatedly. Taking the maximum cell of an LCS table is not a substitute for understanding its final state. Submit Pack Value and Common Log; draw their tables for tiny inputs, then reconstruct one chosen pack or one common subsequence. For revision, state transitions for edit distance and a tree independent-set problem before coding.`,
                }],
        },
        {
            slug: 'range-query-structures', title: '21. Fenwick trees, segment trees, and range queries',
            description: 'Dynamic prefixes, associative summaries, point updates, sparse tables, and lazy propagation.',
            lessons: [{
                    slug: 'maintain-cumulative-information', title: 'Maintain summaries when values change', estimatedMinutes: 50,
                    summary: 'Replace costly prefix rebuilding with logarithmic updates and queries.',
                    problemSlugs: ['dynamic-ledger'], resources: [],
                    content: `## Static prefixes have an update weakness
A prefix-sum table answers a range in O(1), but modifying an early value changes many later prefixes. A Fenwick tree stores carefully chosen partial sums so a point addition and a prefix query each touch O(log n) entries. Its internal indices are one-based even when public problem indices are zero-based.

The expression i & -i extracts the lowest set bit. During an update, add it to move to containing ranges; during a query, subtract it to move to disjoint ranges that cover the desired prefix. Define prefix(end) as the sum over zero-based [0, end), so an inclusive range is prefix(right + 1) - prefix(left).

## Worked example

\`\`\`python
class Fenwick:
    def __init__(self, size):
        self.tree = [0] * (size + 1)

    def add(self, index, delta):
        index += 1
        while index < len(self.tree):
            self.tree[index] += delta
            index += index & -index

    def prefix(self, end):
        total = 0
        while end:
            total += self.tree[end]
            end -= end & -end
        return total
\`\`\`

Storage is O(n); initializing with n point updates costs O(n log n), though linear construction is possible. A segment tree stores an associative summary for each interval and supports point updates plus range sums/minima/maxima in O(log n). It needs a neutral element, such as zero for sums or infinity for minima. Lazy propagation postpones range updates while maintaining a tag describing pending work; tag composition order matters. For immutable range minima, a sparse table uses O(n log n) preprocessing and O(1) queries because minimum is idempotent.

## Common errors and checkpoint
Calling an internal update at index zero without first converting to one-based indexing causes an infinite loop. An add operation differs from assignment; assignment needs a delta computed from the previous value. Fenwick range subtraction relies on invertible prefix summaries and does not directly give arbitrary range minima. Submit Dynamic Ledger and compare it against a plain list on small random operation sequences. Explain why a static prefix table is still preferable when there are no updates.`,
                }],
        },
        {
            slug: 'advanced-string-algorithms', title: '22. KMP, rolling hashes, and suffix structures',
            description: 'Linear matching, prefix borders, overlap handling, hash collisions, and suffix indexing.',
            lessons: [{
                    slug: 'reuse-matched-prefixes', title: 'Reuse the part of a match you already know', estimatedMinutes: 50,
                    summary: 'Find overlapping patterns without restarting from every text position.',
                    problemSlugs: ['pattern-stations'], resources: [],
                    content: `## Matching from scratch repeats work
Checking a length-m pattern at all n text positions can require O(nm) comparisons. KMP remembers a matched prefix length. When the next character disagrees, a prefix table identifies the longest shorter prefix that is also a suffix of the matched characters. No text character needs to be revisited by moving the text pointer backward.

For pattern ababa, the prefix table is [0, 0, 1, 2, 3]. Its final 3 means aba is both a proper prefix and a suffix. After reporting a match, fall back to that border rather than zero so overlapping matches remain visible.

## Worked example: build the prefix table

\`\`\`python
def prefix_table(pattern):
    border = [0] * len(pattern)
    matched = 0
    for index in range(1, len(pattern)):
        while matched and pattern[index] != pattern[matched]:
            matched = border[matched - 1]
        if pattern[index] == pattern[matched]:
            matched += 1
        border[index] = matched
    return border

print(prefix_table("ababa"))  # [0, 0, 1, 2, 3]
\`\`\`

Scan text with the same fallback rule, report index - m + 1 when matched reaches m, then set matched = border[matched - 1]. Preprocessing takes O(m), scanning takes O(n), and the table uses O(m) space. Repeated fallback remains linear because matched can increase only once per processed character and decreases during fallback.

Rolling hashes compare substring fingerprints after prefix preprocessing, but equal hashes can collide; double hashing reduces risk without proving equality. The Z algorithm records longest prefix matches starting at each position and is another linear matching tool. Suffix arrays sort all suffix positions, supporting repeated-pattern queries and longest-common-prefix analysis; building them efficiently needs more care than sorting materialized suffix strings. Aho–Corasick adds failure links to a trie to search many patterns together.

## Common errors and checkpoint
Use border[matched - 1], not matched - 1, when falling back. State how empty patterns behave; Pattern Stations requires a non-empty pattern. Resetting to zero after a match misses some overlaps. Submit Pattern Stations, trace aaaaa with pattern aa, and compare KMP with a brute-force matcher on short strings. Finish the course by revisiting missed problems and explaining correctness and complexity before submitting.`,
                }],
        },
    ],
};
