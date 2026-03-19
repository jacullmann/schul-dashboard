const { performance } = require('perf_hooks');
const fractionalIndex = require('fractional-indexing');

function generateKeyBetween(a, b) {
  return fractionalIndex.generateKeyBetween(a, b);
}

function sequentialUpdate(unpositioned, positioned) {
  let cursor = null;
  const queries = [];
  for (const t of unpositioned) {
    const nextAnchor = positioned[0] || null;
    try {
      cursor = generateKeyBetween(cursor, nextAnchor);
    } catch {
      cursor = generateKeyBetween(null, null);
    }
    // Simulate query
    queries.push({ id: t.id, position: cursor });
    positioned.unshift(cursor);
    positioned.sort();
  }
  return queries;
}

function optimizedUpdate(unpositioned, positioned) {
  let cursor = null;
  const updates = [];
  for (const t of unpositioned) {
    const nextAnchor = positioned[0] || null;
    try {
      cursor = generateKeyBetween(cursor, nextAnchor);
    } catch {
      cursor = generateKeyBetween(null, null);
    }
    updates.push({ id: t.id, position: cursor });
    positioned.unshift(cursor);
    positioned.sort();
  }
  // Simulate Promise.all queries
  return updates;
}

const unpositioned = Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}` }));
const positioned = [];

const s1 = performance.now();
sequentialUpdate([...unpositioned], [...positioned]);
const e1 = performance.now();

const s2 = performance.now();
optimizedUpdate([...unpositioned], [...positioned]);
const e2 = performance.now();

console.log(`Preparation logic: ${e1 - s1}ms vs ${e2 - s2}ms`);
