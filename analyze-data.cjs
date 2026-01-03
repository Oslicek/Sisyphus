const fs = require('fs');

function parseCSV(text, filterCombined = false) {
  const lines = text.trim().split('\n').slice(1);
  return lines.map(line => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { parts.push(current); current = ''; }
      else current += char;
    }
    parts.push(current);
    return { id: parts[0], name: parts[1], sum: parseInt(parts[2]) || 0 };
  }).filter(i => i.sum > 0 && i.id !== '0' && (!filterCombined || !i.id.includes(' a ')));
}

// ANALYZE REVENUES
console.log('=== ANALYZING REVENUES ===');
const revText = fs.readFileSync('public/data/budget/prijmy_druhove_2026.csv', 'utf-8');
const revItems = parseCSV(revText, false); // Don't filter yet

// Find combined codes
const combinedCodes = revItems.filter(i => i.id.includes(' a '));
console.log('Combined codes in revenues:');
combinedCodes.forEach(c => console.log(`  ${c.id} = ${c.sum}`));

// Check if component codes exist
combinedCodes.forEach(c => {
  const parts = c.id.split(' a ');
  parts.forEach(p => {
    const exists = revItems.find(i => i.id === p);
    console.log(`  Component ${p} exists: ${exists ? 'YES (' + exists.sum + ')' : 'NO'}`);
  });
});

const text = fs.readFileSync('public/data/budget/vydaje_odvetvove_2026.csv', 'utf-8');
const items = parseCSV(text);

// Check a specific hierarchy - '22' and its children
const node22 = items.filter(i => i.id === '22' || i.id.startsWith('22'));
console.log('Node 22 and children:');
node22.forEach(n => console.log('  ' + n.id + ' = ' + n.sum));

const children22 = node22.filter(n => n.id !== '22');
const childSum = children22.reduce((s, n) => s + n.sum, 0);
console.log('  Sum of 22 children:', childSum);
console.log('  Value of 22 itself:', node22.find(n => n.id === '22')?.sum);

// Find all parent nodes where value != sum of children
console.log('\nParents where value != sum of direct children:');
const allIds = items.map(i => i.id);
items.forEach(item => {
  // Find direct children
  const directChildren = items.filter(other => {
    if (other.id === item.id) return false;
    if (!other.id.startsWith(item.id)) return false;
    // Check if there's an intermediate parent
    for (let len = item.id.length + 1; len < other.id.length; len++) {
      if (allIds.includes(other.id.substring(0, len))) return false;
    }
    return true;
  });
  
  if (directChildren.length > 0) {
    const childSum = directChildren.reduce((s, c) => s + c.sum, 0);
    const diff = item.sum - childSum;
    if (Math.abs(diff) > 1) {
      console.log(`  ${item.id}: value=${item.sum}, childSum=${childSum}, diff=${diff}`);
    }
  }
});

// Now calculate what the treemap sees
console.log('\n=== Treemap calculation ===');
// Effective leaves are items with no children
const leaves = items.filter(item => 
  !items.some(other => other.id !== item.id && other.id.startsWith(item.id))
);
console.log('Effective leaves count:', leaves.length);
console.log('Effective leaves sum:', leaves.reduce((s, i) => s + i.sum, 0));
console.log('Expected total:', 2408672638307);

// Check node 31 specifically
console.log('\n=== Node 31 analysis ===');
const node31family = items.filter(i => i.id === '31' || i.id.startsWith('31') || i.id === '3');
node31family.sort((a, b) => a.id.localeCompare(b.id));
node31family.forEach(n => console.log(`  ${n.id} = ${n.sum} (${n.name})`));

// Check if 3 is the parent of 31
console.log('\n=== Check hierarchy of 3 ===');
const node3family = items.filter(i => i.id === '3' || (i.id.startsWith('3') && i.id.length === 2));
node3family.sort((a, b) => a.id.localeCompare(b.id));
node3family.forEach(n => console.log(`  ${n.id} = ${n.sum}`));
const node3children = node3family.filter(n => n.id !== '3');
console.log('Sum of 3x children:', node3children.reduce((s, n) => s + n.sum, 0));
console.log('Value of 3:', node3family.find(n => n.id === '3')?.sum);

