import * as XLSXNamespace from 'xlsx';
import fs from 'fs';

const XLSX = XLSXNamespace.default || XLSXNamespace;

/**
 * Analyze the structure of the Excel file to understand its format
 */
async function analyzeExcel(filePath: string) {
  console.log('='.repeat(60));
  console.log('Excel Structure Analyzer');
  console.log('='.repeat(60));
  console.log();

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`📂 Reading Excel file: ${filePath}`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`✅ Excel file loaded successfully`);
    console.log(`📊 Available sheets: ${workbook.SheetNames.join(', ')}`);
    console.log();

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log('='.repeat(60));
      console.log(`Sheet: "${sheetName}"`);
      console.log('='.repeat(60));
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length === 0) {
        console.log('⚠️  Empty sheet');
        console.log();
        continue;
      }

      // Show first row (headers)
      console.log('Headers (First Row):');
      const headers = data[0] as any[];
      headers.forEach((header, index) => {
        console.log(`  Column ${index}: ${header}`);
      });
      console.log();

      // Show first 3 data rows as examples
      console.log('Sample Data (First 3 rows):');
      for (let i = 1; i < Math.min(4, data.length); i++) {
        console.log(`\nRow ${i}:`);
        const row = data[i] as any[];
        headers.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== '') {
            console.log(`  ${header}: ${row[index]}`);
          }
        });
      }
      console.log();

      // Show total rows
      console.log(`Total rows: ${data.length - 1} (excluding header)`);
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Run if called directly
const filePath = process.argv[2] || 'import-data.xlsx';
analyzeExcel(filePath)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { analyzeExcel };
