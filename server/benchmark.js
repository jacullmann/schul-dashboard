const { performance } = require('perf_hooks');

async function mockDbUpdateSequential(items) {
  for (const item of items) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate 10ms network delay
  }
}

async function mockDbUpdateConcurrent(items) {
  const promises = items.map(item => new Promise(resolve => setTimeout(resolve, 10)));
  await Promise.all(promises);
}

async function runBenchmark() {
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));

  const startSeq = performance.now();
  await mockDbUpdateSequential(items);
  const endSeq = performance.now();

  const startConc = performance.now();
  await mockDbUpdateConcurrent(items);
  const endConc = performance.now();

  console.log(`Sequential: ${endSeq - startSeq}ms`);
  console.log(`Concurrent: ${endConc - startConc}ms`);
}

runBenchmark();
