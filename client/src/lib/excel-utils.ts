import * as XLSX from 'xlsx';
import { InsertRoom, InsertTag } from '@shared/schema';

export interface ExcelRoom {
  Wing: string;
  'Room Number': string | number;
  Gender: string;
  'Total Beds': number;
}

export interface ExcelTag {
  'Tag Number': string;
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
          
          return {
            wing: wing,
            roomNumber: roomNumber,
            gender: gender as 'Male' | 'Female',
            totalBeds: row['Total Beds'],
            availableBeds: row['Total Beds'], // Initially all beds are available
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

export function exportUsersToExcel(users: any[]): void {
  try {
    const exportData = users.map(user => ({
      'First Name': user.firstName || '',
      'Middle Name': user.middleName || '',
      'Surname': user.surname || '',
      'Date of Birth': user.dob ? new Date(user.dob).toLocaleDateString() : '',
      'Gender': user.gender || '',
      'Phone': user.phone || '',
      'Email': user.email || '',
      'State of Origin': user.stateOfOrigin || '',
      'LGA': user.lga || '',
      'Room Number': user.roomNumber || 'Not assigned',
      'Tag Number': user.tagNumber || 'Not assigned',
      'Registration Date': user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : '',
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Middle Name
      { wch: 15 }, // Surname
      { wch: 12 }, // Date of Birth
      { wch: 8 },  // Gender
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 20 }, // State of Origin
      { wch: 20 }, // LGA
      { wch: 12 }, // Room Number
      { wch: 12 }, // Tag Number
      { wch: 15 }, // Registration Date
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export data. Please try again.');
  }
}
