const { generateKeyBetween } = require('fractional-indexing');

let cursor = null;
let positioned = ["b"];

for (let i = 0; i < 3; i++) {
  const nextAnchor = positioned[0] || null;
  try {
    cursor = generateKeyBetween(cursor, nextAnchor);
    console.log(`Success: cursor=${cursor}`);
  } catch (e) {
    cursor = generateKeyBetween(null, null);
    console.log(`Caught: cursor=${cursor}`);
  }
  positioned.unshift(cursor);
  positioned.sort();
}
console.log("Final positioned:", positioned);
