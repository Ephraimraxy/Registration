import * as XLSX from 'xlsx';
import { InsertRoom, InsertTag } from '@shared/schema';

export interface ExcelRoom {
  Wing: string;
  'Room Number': string | number;
  Gender: string;
  'Total Beds': number;
  'Bed Numbers'?: string; // Optional column for individual bed numbers (can be "RESERVED" for VIP rooms)
}

export interface ExcelTag {
  'Tag Number': string;
}

/**
 * Parse bed numbers from various formats
 */
function parseBedNumbers(bedNumbersStr: string, totalBeds: number): string[] {
  if (!bedNumbersStr || bedNumbersStr.trim() === '') {
    return generateDefaultBedNumbers(totalBeds);
  }
  
  const bedNumbers: string[] = [];
  const cleaned = bedNumbersStr.toString().trim().toUpperCase();
  
  // Handle RESERVED/VIP rooms
  if (cleaned === 'RESERVED') {
    // For VIP rooms, generate special bed numbers
    for (let i = 1; i <= totalBeds; i++) {
      bedNumbers.push(`VIP${i.toString().padStart(3, '0')}`);
    }
    return bedNumbers;
  }
  
  // Handle different separators
  const separators = [',', ';', '\n', '\t'];
  let parts: string[] = [cleaned];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      parts = cleaned.split(sep).map(p => p.trim()).filter(p => p);
      break;
    }
  }
  
  // Handle range format (e.g., "001-004")
  if (parts.length === 1 && parts[0].includes('-')) {
    const rangeParts = parts[0].split('-');
    if (rangeParts.length === 2) {
      const start = parseInt(rangeParts[0].trim());
      const end = parseInt(rangeParts[1].trim());
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          bedNumbers.push(i.toString().padStart(3, '0'));
        }
        return bedNumbers;
      }
    }
  }
  
  // Process individual bed numbers
  for (const part of parts) {
    if (part) {
      // Extract number and pad with zeros
      const num = parseInt(part.replace(/\D/g, ''));
      if (!isNaN(num)) {
        bedNumbers.push(num.toString().padStart(3, '0'));
      }
    }
  }
  
  // If we have the right number of beds, return them
  if (bedNumbers.length === totalBeds) {
    return bedNumbers;
  }
  
  // If we have some but not all, fill the rest
  if (bedNumbers.length > 0 && bedNumbers.length < totalBeds) {
    const missing = totalBeds - bedNumbers.length;
    for (let i = 1; i <= missing; i++) {
      const nextNum = Math.max(...bedNumbers.map(b => parseInt(b))) + i;
      bedNumbers.push(nextNum.toString().padStart(3, '0'));
    }
    return bedNumbers;
  }
  
  // If parsing failed, generate default numbers
  return generateDefaultBedNumbers(totalBeds);
}

/**
 * Generate default bed numbers (001, 002, 003, etc.)
 */
function generateDefaultBedNumbers(totalBeds: number): string[] {
  const bedNumbers: string[] = [];
  for (let i = 1; i <= totalBeds; i++) {
    bedNumbers.push(i.toString().padStart(3, '0'));
  }
  return bedNumbers;
}

export function parseRoomsExcel(file: File): Promise<InsertRoom[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRoom[] = XLSX.utils.sheet_to_json(worksheet);
        
        const rooms: InsertRoom[] = jsonData.map((row, index) => {
          // Validate required fields
          if (!row.Wing || !row['Room Number'] || !row.Gender || !row['Total Beds']) {
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
          
          // Parse bed numbers if provided, otherwise auto-generate
          const bedNumbers = row['Bed Numbers'] 
            ? parseBedNumbers(row['Bed Numbers'], row['Total Beds'])
            : generateDefaultBedNumbers(row['Total Beds']);
          
          // Check if this is a VIP/reserved room
          const isVipRoom = Boolean(row['Bed Numbers'] && row['Bed Numbers'].toString().trim().toUpperCase() === 'RESERVED');
          
          return {
            wing: wing,
            roomNumber: roomNumber,
            gender: gender as 'Male' | 'Female',
            totalBeds: row['Total Beds'],
            availableBeds: row['Total Beds'], // Initially all beds are available
            bedNumbers: bedNumbers, // Store the parsed bed numbers
            isVipRoom: isVipRoom, // Mark as VIP room
          };
        });
        
        resolve(rooms);
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

export function exportUsersToExcel(users: any[], exportType: 'full' | 'summary' = 'full'): void {
  try {
    let exportData;
    
    if (exportType === 'summary') {
      // Summary format - only essential fields
      exportData = users.map(user => ({
        'Name': `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim(),
        'Gender': user.gender || '',
        'Room Number': user.roomNumber || 'Not assigned',
        'Tag Number': user.tagNumber || 'Not assigned',
        'State': user.stateOfOrigin || '',
        'Phone': user.phone || '',
        'Email': user.email || '',
      }));
    } else {
      // Full format - all fields
      exportData = users.map(user => ({
        'First Name': user.firstName || '',
        'Middle Name': user.middleName || '',
        'Surname': user.surname || '',
        'Date of Birth': user.dob ? new Date(user.dob).toLocaleDateString() : '',
        'Gender': user.gender || '',
        'Phone': user.phone || '',
        'Email': user.email || '',
        'NIN': user.nin || 'Not provided',
        'State of Origin': user.stateOfOrigin || '',
        'LGA': user.lga || '',
        'Room Number': user.roomNumber || 'Not assigned',
        'Tag Number': user.tagNumber || 'Not assigned',
        'Registration Date': user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : '',
      }));
    }
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths based on export type
    let colWidths;
    if (exportType === 'summary') {
      colWidths = [
        { wch: 25 }, // Name
        { wch: 8 },  // Gender
        { wch: 12 }, // Room Number
        { wch: 12 }, // Tag Number
        { wch: 15 }, // State
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
      ];
    } else {
      colWidths = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Middle Name
        { wch: 15 }, // Surname
        { wch: 12 }, // Date of Birth
        { wch: 8 },  // Gender
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 15 }, // NIN
        { wch: 20 }, // State of Origin
        { wch: 20 }, // LGA
        { wch: 12 }, // Room Number
        { wch: 12 }, // Tag Number
        { wch: 15 }, // Registration Date
      ];
    }
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const fileName = `users_export_${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export data. Please try again.');
  }
}
