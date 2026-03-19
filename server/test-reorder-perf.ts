import { generateKeyBetween } from 'fractional-indexing';

function generateUnpositioned() {
  return Array.from({ length: 50 }, (_, i) => ({ id: `id-${i}` }));
}

function generatePositioned() {
  return [generateKeyBetween(null, null)];
}

async function simulateDbCall() {
  return new Promise(resolve => setTimeout(resolve, 5)); // Simulate 5ms DB update
}

async function sequential(unpositioned: any[], positioned: any[]) {
  const start = performance.now();
  let cursor: string | null = null;
  for (const t of unpositioned) {
    const nextAnchor = positioned[0] || null;
    try {
      cursor = generateKeyBetween(cursor, nextAnchor);
    } catch {
      cursor = generateKeyBetween(null, null);
    }

    // Simulate `await sb.from('encrypted_todos').update({ position: cursor }).eq('id', t.id);`
    await simulateDbCall();

    positioned.unshift(cursor);
    positioned.sort();
  }
  return performance.now() - start;
}

async function concurrent(unpositioned: any[], positioned: any[]) {
  const start = performance.now();
  let cursor: string | null = null;
  const updates: Promise<any>[] = [];

  for (const t of unpositioned) {
    const nextAnchor = positioned[0] || null;
    try {
      cursor = generateKeyBetween(cursor, nextAnchor);
    } catch {
      cursor = generateKeyBetween(null, null);
    }

    // Collect the update
    updates.push(simulateDbCall());

    positioned.unshift(cursor);
    positioned.sort();
  }

  // Await all updates
  await Promise.all(updates);
  return performance.now() - start;
}

async function run() {
  console.log('Running benchmark for 50 items (5ms simulated DB call)...');
  const seqTime = await sequential(generateUnpositioned(), generatePositioned());
  console.log(`Sequential: ${seqTime.toFixed(2)}ms`);

  const concTime = await concurrent(generateUnpositioned(), generatePositioned());
  console.log(`Concurrent: ${concTime.toFixed(2)}ms`);

  console.log(`Improvement: ${((seqTime - concTime) / seqTime * 100).toFixed(2)}%`);
}

run().catch(console.error);
