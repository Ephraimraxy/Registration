import XLSX from 'xlsx';

// Generate 300 tag numbers
const tags = [];
for (let i = 1; i <= 300; i++) {
  // Format: TAG-001, TAG-002, ..., TAG-300
  const tagNumber = `TAG-${i.toString().padStart(3, '0')}`;
  tags.push({
    'Tag Number': tagNumber
  });
}

// Create a new workbook
const wb = XLSX.utils.book_new();

// Convert tags array to worksheet
const ws = XLSX.utils.json_to_sheet(tags);

// Set column width for better readability
ws['!cols'] = [
  { wch: 15 } // Tag Number column
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Tags');

// Write the file
const filename = 'tags_300.xlsx';
XLSX.writeFile(wb, filename);

console.log(`✅ Successfully generated ${tags.length} tag numbers in ${filename}`);
console.log(`📋 Tag numbers range: TAG-001 to TAG-300`);

