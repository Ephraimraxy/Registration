import * as XLSX from 'xlsx';
import { InsertRoom, InsertTag, InsertUser } from '@shared/schema';

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

export interface ExcelUser {
  'First Name': string;
  'Middle Name'?: string;
  'Surname': string;
  'Date of Birth': string | Date;
  'Gender': string;
  'Phone': string;
  'Email'?: string; // Optional
  'NIN'?: string; // Optional
  'State of Origin': string;
  'LGA': string;
  'Room Number'?: string; // Optional - can specify room to assign
  'Tag Number'?: string; // Optional - can specify tag to assign
  'VIP'?: boolean | string; // Optional - VIP status
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

export interface ExcelRoomRange {
  'Room Range': string;
  'Gender': string;
  'Beds Per Room': number;
  'Wing'?: string;
}

/**
 * Parse room range format (e.g., "RA1-RA64", "201-234")
 * Expands ranges into individual rooms
 */
function parseRoomRange(rangeStr: string, gender: 'Male' | 'Female', bedsPerRoom: number, wing?: string): InsertRoom[] {
  const rooms: InsertRoom[] = [];
  const trimmed = rangeStr.trim();
  
  // Handle special cases like "D&D 120"
  if (!trimmed.includes('-')) {
    // Single room
    const roomNumber = trimmed;
    const roomWing = wing || roomNumber.replace(/\d+/, '').trim() || 'A';
    const bedNumbers = generateDefaultBedNumbers(bedsPerRoom);
    
    rooms.push({
      wing: roomWing,
      roomNumber: roomNumber,
      gender: gender,
      totalBeds: bedsPerRoom,
      availableBeds: bedsPerRoom,
      bedNumbers: bedNumbers,
    });
    return rooms;
  }
  
  // Parse range format
  const parts = trimmed.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid room range format: ${rangeStr}`);
  }
  
  const startStr = parts[0].trim();
  const endStr = parts[1].trim();
  
  // Extract prefix (letters) and number from start
  const startMatch = startStr.match(/^([A-Za-z&]+)?(\d+)$/);
  const endMatch = endStr.match(/^([A-Za-z&]+)?(\d+)$/);
  
  if (!startMatch || !endMatch) {
    throw new Error(`Invalid room range format: ${rangeStr}`);
  }
  
  const startPrefix = startMatch[1] || '';
  const startNum = parseInt(startMatch[2]);
  const endPrefix = endMatch[1] || startPrefix; // Use start prefix if end doesn't have one
  const endNum = parseInt(endMatch[2]);
  
  if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
    throw new Error(`Invalid room range numbers: ${rangeStr}`);
  }
  
  // Determine wing
  const roomWing = wing || startPrefix || 'A';
  
  // Generate rooms in range
  for (let i = startNum; i <= endNum; i++) {
    const roomNumber = startPrefix ? `${startPrefix}${i}` : i.toString();
    const bedNumbers = generateDefaultBedNumbers(bedsPerRoom);
    
    rooms.push({
      wing: roomWing,
      roomNumber: roomNumber,
      gender: gender,
      totalBeds: bedsPerRoom,
      availableBeds: bedsPerRoom,
      bedNumbers: bedNumbers,
    });
  }
  
  return rooms;
}

export function parseRoomsExcelRangeFormat(file: File): Promise<InsertRoom[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRoomRange[] = XLSX.utils.sheet_to_json(worksheet);
        
        const allRooms: InsertRoom[] = [];
        
        jsonData.forEach((row, index) => {
          // Validate required fields
          if (!row['Room Range'] || !row.Gender || !row['Beds Per Room']) {
            throw new Error(`Missing required fields in row ${index + 2}`);
          }
          
          // Normalize gender
          const normalizedGender = row.Gender.toString().toLowerCase();
          if (normalizedGender !== 'male' && normalizedGender !== 'female') {
            throw new Error(`Invalid gender "${row.Gender}" in row ${index + 2}. Must be "Male" or "Female"`);
          }
          
          const gender = normalizedGender === 'male' ? 'Male' : 'Female';
          
          // Validate beds per room
          const bedsPerRoom = typeof row['Beds Per Room'] === 'number' 
            ? row['Beds Per Room'] 
            : parseInt(row['Beds Per Room'].toString());
          
          if (isNaN(bedsPerRoom) || bedsPerRoom <= 0) {
            throw new Error(`Invalid beds per room "${row['Beds Per Room']}" in row ${index + 2}. Must be a positive number`);
          }
          
          // Get wing if provided
          const wing = row.Wing ? row.Wing.toString().trim() : undefined;
          
          // Parse room range and expand to individual rooms
          const roomRange = row['Room Range'].toString().trim();
          const expandedRooms = parseRoomRange(roomRange, gender, bedsPerRoom, wing);
          
          allRooms.push(...expandedRooms);
        });
        
        resolve(allRooms);
      } catch (error: any) {
        reject(new Error(`Error parsing Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
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

export function parseUsersExcel(file: File): Promise<InsertUser[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelUser[] = XLSX.utils.sheet_to_json(worksheet);
        
        const users: InsertUser[] = jsonData.map((row, index) => {
          const rowNum = index + 2; // +2 because index is 0-based and we have a header row
          
          // Validate required fields
          if (!row['First Name'] || !row['Surname'] || !row['Date of Birth'] || !row['Gender'] || 
              !row['Phone'] || !row['State of Origin'] || !row['LGA']) {
            throw new Error(`Missing required fields in row ${rowNum}. Required: First Name, Surname, Date of Birth, Gender, Phone, State of Origin, LGA`);
          }
          
          // Validate phone (minimum 10 digits)
          const phone = row['Phone'].toString().trim();
          if (phone.length < 10) {
            throw new Error(`Invalid phone number in row ${rowNum}. Phone must be at least 10 digits. Got: "${phone}"`);
          }
          
          // Validate email format if provided
          let email: string | undefined = undefined;
          if (row['Email']) {
            const emailStr = row['Email'].toString().trim();
            if (emailStr) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(emailStr)) {
                throw new Error(`Invalid email in row ${rowNum}. Got: "${emailStr}"`);
              }
              email = emailStr;
            }
          }
          
          // Validate NIN format (11 digits) if provided
          let nin: string | undefined = undefined;
          if (row['NIN']) {
            const ninStr = row['NIN'].toString().trim();
            if (ninStr) {
              if (!/^\d{11}$/.test(ninStr)) {
                throw new Error(`Invalid NIN in row ${rowNum}. NIN must be exactly 11 digits. Got: "${ninStr}"`);
              }
              nin = ninStr;
            }
          }
          
          // Normalize gender
          const normalizedGender = row['Gender'].toString().toLowerCase();
          if (normalizedGender !== 'male' && normalizedGender !== 'female') {
            throw new Error(`Invalid gender "${row['Gender']}" in row ${rowNum}. Must be "Male", "Female", "male", or "female"`);
          }
          const gender = normalizedGender === 'male' ? 'Male' : 'Female';
          
          // Parse date of birth
          let dob: string;
          if (row['Date of Birth'] instanceof Date) {
            dob = row['Date of Birth'].toISOString().split('T')[0];
          } else {
            // Try to parse the date string
            const dateStr = row['Date of Birth'].toString().trim();
            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
              throw new Error(`Invalid date of birth in row ${rowNum}. Got: "${dateStr}"`);
            }
            dob = parsedDate.toISOString().split('T')[0];
          }
          
          // Parse VIP status
          let isVip = false;
          if (row['VIP']) {
            const vipValue = row['VIP'].toString().toLowerCase().trim();
            isVip = vipValue === 'true' || vipValue === 'yes' || vipValue === '1' || vipValue === 'vip';
          }
          
          return {
            firstName: row['First Name'].toString().trim(),
            middleName: row['Middle Name'] ? row['Middle Name'].toString().trim() : undefined,
            surname: row['Surname'].toString().trim(),
            dob: dob,
            gender: gender as 'Male' | 'Female',
            phone: phone,
            email: email,
            nin: nin,
            stateOfOrigin: row['State of Origin'].toString().trim(),
            lga: row['LGA'].toString().trim(),
            isVip: isVip,
            // Optional room/tag selection - store as roomNumber/tagNumber strings, will be converted to IDs during upload
            selectedRoomNumber: row['Room Number'] ? row['Room Number'].toString().trim() : undefined,
            selectedTagNumber: row['Tag Number'] ? row['Tag Number'].toString().trim() : undefined,
          };
        });
        
        resolve(users);
      } catch (error: any) {
        reject(new Error(`Error parsing Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function exportUsersToExcel(users: any[], exportType: 'full' | 'summary' | 'custom' = 'full', selectedColumns?: string[]): void {
  try {
    let exportData;
    
    if (exportType === 'custom' && selectedColumns) {
      // Custom format - only selected columns
      const columnMap: Record<string, (user: any) => string> = {
        'First Name': (user) => user.firstName || '',
        'Middle Name': (user) => user.middleName || '',
        'Surname': (user) => user.surname || '',
        'Full Name': (user) => `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim(),
        'Date of Birth': (user) => user.dob ? new Date(user.dob).toLocaleDateString() : '',
        'Gender': (user) => user.gender || '',
        'Phone': (user) => user.phone || '',
        'Email': (user) => user.email || 'Not provided',
        'NIN': (user) => user.nin || 'Not provided',
        'State of Origin': (user) => user.stateOfOrigin || '',
        'LGA': (user) => user.lga || '',
        'Wing': (user) => (user as any).wing || 'Not assigned',
        'Room Number': (user) => user.roomNumber || 'Not assigned',
        'Bed Number': (user) => user.bedNumber || 'Not assigned',
        'Room Status': (user) => user.roomStatus || 'Not assigned',
        'Tag Number': (user) => user.tagNumber || 'Not assigned',
        'Tag Status': (user) => user.tagStatus || 'Not assigned',
        'Specialization': (user) => user.specialization || 'Not selected',
        'VIP Status': (user) => (user as any).isVip ? 'Yes' : 'No',
        'Registration Date': (user) => user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : '',
      };

      exportData = users.map(user => {
        const row: Record<string, string> = {};
        selectedColumns.forEach(col => {
          if (columnMap[col]) {
            row[col] = columnMap[col](user);
          }
        });
        return row;
      });
    } else if (exportType === 'summary') {
      // Summary format - only essential fields
      exportData = users.map(user => ({
        'Name': `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim(),
        'Gender': user.gender || '',
        'Room Number': user.roomNumber || 'Not assigned',
        'Tag Number': user.tagNumber || 'Not assigned',
        'State': user.stateOfOrigin || '',
        'Phone': user.phone || '',
        'Email': user.email || '',
        'Specialization': user.specialization || 'Not selected',
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
        'Email': user.email || 'Not provided',
        'NIN': user.nin || 'Not provided',
        'State of Origin': user.stateOfOrigin || '',
        'LGA': user.lga || '',
        'Wing': (user as any).wing || 'Not assigned',
        'Room Number': user.roomNumber || 'Not assigned',
        'Bed Number': user.bedNumber || 'Not assigned',
        'Room Status': user.roomStatus || 'Not assigned',
        'Tag Number': user.tagNumber || 'Not assigned',
        'Tag Status': user.tagStatus || 'Not assigned',
        'Specialization': user.specialization || 'Not selected',
        'VIP Status': (user as any).isVip ? 'Yes' : 'No',
        'Registration Date': user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : '',
      }));
    }
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths based on export type
    let colWidths;
    if (exportType === 'custom' && selectedColumns) {
      // Dynamic column widths for custom export
      const widthMap: Record<string, number> = {
        'First Name': 15,
        'Middle Name': 15,
        'Surname': 15,
        'Full Name': 25,
        'Date of Birth': 12,
        'Gender': 8,
        'Phone': 15,
        'Email': 25,
        'NIN': 15,
        'State of Origin': 20,
        'LGA': 20,
        'Wing': 10,
        'Room Number': 12,
        'Bed Number': 12,
        'Room Status': 12,
        'Tag Number': 12,
        'Tag Status': 12,
        'Specialization': 25,
        'VIP Status': 10,
        'Registration Date': 15,
      };
      colWidths = selectedColumns.map(col => ({ wch: widthMap[col] || 15 }));
    } else if (exportType === 'summary') {
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
        { wch: 10 }, // Wing
        { wch: 12 }, // Room Number
        { wch: 12 }, // Bed Number
        { wch: 12 }, // Room Status
        { wch: 12 }, // Tag Number
        { wch: 12 }, // Tag Status
        { wch: 25 }, // Specialization
        { wch: 10 }, // VIP Status
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
