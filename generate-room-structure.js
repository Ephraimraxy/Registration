import XLSX from 'xlsx';

// Room structure data
const roomData = [
  // Male Rooms
  { 'Room Range': 'RA1-RA64', 'Gender': 'Male', 'Beds Per Room': 1, 'Wing': 'RA' },
  { 'Room Range': 'RE1-RE48', 'Gender': 'Male', 'Beds Per Room': 1, 'Wing': 'RE' },
  { 'Room Range': '201-234', 'Gender': 'Male', 'Beds Per Room': 4, 'Wing': 'A' },
  { 'Room Range': 'D&D 120', 'Gender': 'Male', 'Beds Per Room': 1, 'Wing': 'D&D' },
  { 'Room Range': '401-416', 'Gender': 'Male', 'Beds Per Room': 3, 'Wing': 'B' },
  { 'Room Range': '422-433', 'Gender': 'Male', 'Beds Per Room': 3, 'Wing': 'B' },
  
  // Female Rooms
  { 'Room Range': '401-416', 'Gender': 'Female', 'Beds Per Room': 3, 'Wing': 'B' },
  { 'Room Range': '422-433', 'Gender': 'Female', 'Beds Per Room': 3, 'Wing': 'B' },
];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(roomData);

// Set column widths
ws['!cols'] = [
  { wch: 20 }, // Room Range
  { wch: 10 }, // Gender
  { wch: 15 }, // Beds Per Room
  { wch: 10 }, // Wing
];

XLSX.utils.book_append_sheet(wb, ws, 'Rooms');

// Write file
XLSX.writeFile(wb, 'room_structure_range_format.xlsx');
console.log('Room structure Excel file created: room_structure_range_format.xlsx');

