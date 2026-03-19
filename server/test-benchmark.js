const { generateKeyBetween, generateNKeysBetween } = require('fractional-indexing');
const perfHooks = require('perf_hooks');
const performance = perfHooks.performance;

function originalApproach(unpositionedLength) {
    let cursor = null;
    let positioned = ['a0'];
    let generated = [];

    for (let i = 0; i < unpositionedLength; i++) {
        const nextAnchor = positioned[0] || null;
        try {
            cursor = generateKeyBetween(cursor, nextAnchor);
        } catch {
            cursor = generateKeyBetween(null, null);
        }
        generated.push(cursor);
        positioned.unshift(cursor);
        positioned.sort();
    }
    return generated;
}

function optimizedApproach(unpositionedLength) {
    let nextAnchor = 'a0';
    try {
        return generateNKeysBetween(null, nextAnchor, unpositionedLength);
    } catch {
        return Array.from({length: unpositionedLength}, () => generateKeyBetween(null, null));
    }
}

const numItems = 10000;

const start1 = performance.now();
originalApproach(numItems);
const end1 = performance.now();

const start2 = performance.now();
optimizedApproach(numItems);
const end2 = performance.now();

console.log(`Original: ${end1 - start1} ms`);
console.log(`Optimized: ${end2 - start2} ms`);
