import * as XLSX from 'xlsx';
import { InsertRoom, InsertTag } from '@shared/schema';

// Enhanced interfaces to support both import methods
export interface ExcelRoom {
  Wing: string;
  'Room Number': string | number;
  Gender: string;
  'Total Beds': number;
  'Bed Numbers'?: string; // Optional - for individual bed numbering
}

export interface ExcelTag {
  'Tag Number': string;
}

// Enhanced room data structure
export interface EnhancedRoom extends InsertRoom {
  beds?: Array<{
    bedNumber: string;
    isOccupied: boolean;
    assignedUserId?: string;
    assignedAt?: Date;
  }>;
}

/**
 * Intelligently parses room Excel files supporting both formats:
 * 1. Simple format: Just total beds count
 * 2. Detailed format: Individual bed numbers
 */
export function parseRoomsExcel(file: File): Promise<EnhancedRoom[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRoom[] = XLSX.utils.sheet_to_json(worksheet);
        
        const rooms: EnhancedRoom[] = jsonData.map((row, index) => {
          // Validate required fields
          if (!row.Wing || !row['Room Number'] || !row['Gender'] || !row['Total Beds']) {
            throw new Error(`Missing required fields in row ${index + 2}`);
          }
          
          // Normalize gender to proper case
          const normalizedGender = row.Gender.toString().toLowerCase();
          if (normalizedGender !== 'male' && normalizedGender !== 'female') {
            throw new Error(`Invalid gender "${row.Gender}" in row ${index + 2}. Must be "Male", "Female", "male", or "female"`);
          }
          
          if (typeof row['Total Beds'] !== 'number' || row['Total Beds'] <= 0) {
            throw new Error(`Invalid total beds "${row['Total Beds']}" in row ${index + 2}. Must be a positive number`);
          }
          
          // Create room number by combining wing and number
          const wing = row.Wing.toString().trim();
          const roomNum = row['Room Number'].toString().trim();
          const roomNumber = `${wing}${roomNum}`;
          
          // Normalize gender to proper case
          const gender = normalizedGender === 'male' ? 'Male' : 'Female';
          
          // Check if individual bed numbers are provided
          const hasIndividualBeds = row['Bed Numbers'] && row['Bed Numbers'].toString().trim() !== '';
          
          let beds: Array<{
            bedNumber: string;
            isOccupied: boolean;
            assignedUserId?: string;
            assignedAt?: Date;
          }> = [];
          
          if (hasIndividualBeds) {
            // Parse individual bed numbers
            beds = parseBedNumbers(row['Bed Numbers']!.toString().trim(), row['Total Beds']);
          } else {
            // Generate default bed numbers (001, 002, 003, etc.)
            beds = generateDefaultBedNumbers(row['Total Beds']);
          }
          
          return {
            wing: wing,
            roomNumber: roomNumber,
            gender: gender as 'Male' | 'Female',
            totalBeds: row['Total Beds'],
            availableBeds: row['Total Beds'], // Initially all beds are available
            beds: beds, // Individual bed tracking
          };
        });
        
        resolve(rooms);
      } catch (error) {
        reject(new Error(`Error parsing Excel file: ${error.message}`));
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses individual bed numbers from various formats:
 * - "001,002,003,004" (comma-separated)
 * - "001-004" (range format)
 * - "001 002 003 004" (space-separated)
 */
function parseBedNumbers(bedNumbersStr: string, totalBeds: number): Array<{
  bedNumber: string;
  isOccupied: boolean;
  assignedUserId?: string;
  assignedAt?: Date;
}> {
  const beds: Array<{
    bedNumber: string;
    isOccupied: boolean;
    assignedUserId?: string;
    assignedAt?: Date;
  }> = [];
  
  // Handle range format (e.g., "001-004")
  if (bedNumbersStr.includes('-')) {
    const [start, end] = bedNumbersStr.split('-').map(s => s.trim());
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      throw new Error(`Invalid bed range format: ${bedNumbersStr}`);
    }
    
    for (let i = startNum; i <= endNum; i++) {
      beds.push({
        bedNumber: i.toString().padStart(3, '0'),
        isOccupied: false,
      });
    }
  } else {
    // Handle comma or space separated format
    const separators = bedNumbersStr.includes(',') ? ',' : ' ';
    const bedNumbers = bedNumbersStr.split(separators).map(s => s.trim()).filter(s => s !== '');
    
    for (const bedNum of bedNumbers) {
      beds.push({
        bedNumber: bedNum.padStart(3, '0'),
        isOccupied: false,
      });
    }
  }
  
  // Validate that the number of beds matches totalBeds
  if (beds.length !== totalBeds) {
    throw new Error(`Number of individual beds (${beds.length}) doesn't match total beds (${totalBeds})`);
  }
  
  return beds;
}

/**
 * Generates default bed numbers when individual numbers aren't provided
 */
function generateDefaultBedNumbers(totalBeds: number): Array<{
  bedNumber: string;
  isOccupied: boolean;
  assignedUserId?: string;
  assignedAt?: Date;
}> {
  const beds: Array<{
    bedNumber: string;
    isOccupied: boolean;
    assignedUserId?: string;
    assignedAt?: Date;
  }> = [];
  
  for (let i = 1; i <= totalBeds; i++) {
    beds.push({
      bedNumber: i.toString().padStart(3, '0'),
      isOccupied: false,
    });
  }
  
  return beds;
}

/**
 * Detects the import format used in the Excel file
 */
export function detectImportFormat(file: File): Promise<'simple' | 'detailed'> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          throw new Error('Empty Excel file');
        }
        
        const firstRow = jsonData[0] as any;
        const hasBedNumbers = firstRow['Bed Numbers'] && firstRow['Bed Numbers'].toString().trim() !== '';
        
        resolve(hasBedNumbers ? 'detailed' : 'simple');
      } catch (error) {
        reject(new Error(`Error detecting format: ${error.message}`));
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Keep the existing tag parsing function
export function parseTagsExcel(file: File): Promise<InsertTag[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelTag[] = XLSX.utils.sheet_to_json(worksheet);
        
        const tags: InsertTag[] = jsonData.map((row, index) => {
          // Validate required fields
          if (!row['Tag Number']) {
            throw new Error(`Missing tag number in row ${index + 2}`);
          }
          
          return {
            tagNumber: row['Tag Number'].toString().trim(),
            isAssigned: false,
          };
        });
        
        resolve(tags);
      } catch (error) {
        reject(new Error(`Error parsing Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
