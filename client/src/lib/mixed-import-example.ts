// Example of mixed import handling
import { parseRoomsExcel } from './enhanced-excel-utils';

// Example Excel data with mixed formats
const mixedExcelData = [
  {
    Wing: "A",
    "Room Number": "101",
    Gender: "Male",
    "Total Beds": 4,
    "Bed Numbers": "001,002,003,004"  // Detailed format
  },
  {
    Wing: "A", 
    "Room Number": "102",
    Gender: "Male",
    "Total Beds": 4
    // No "Bed Numbers" column - will auto-generate
  },
  {
    Wing: "A",
    "Room Number": "103", 
    Gender: "Male",
    "Total Beds": 3,
    "Bed Numbers": "001-003"  // Range format
  },
  {
    Wing: "B",
    "Room Number": "201",
    Gender: "Female", 
    "Total Beds": 2
    // No "Bed Numbers" column - will auto-generate
  },
  {
    Wing: "B",
    "Room Number": "202",
    Gender: "Female",
    "Total Beds": 3,
    "Bed Numbers": "001 002 003"  // Space-separated format
  }
];

// How the system processes each room:

// Room A101: Uses your specific bed numbers
// Result: {
//   roomNumber: "A101",
//   totalBeds: 4,
//   availableBeds: 4,
//   beds: [
//     { bedNumber: "001", isOccupied: false },
//     { bedNumber: "002", isOccupied: false },
//     { bedNumber: "003", isOccupied: false },
//     { bedNumber: "004", isOccupied: false }
//   ]
// }

// Room A102: Auto-generates bed numbers
// Result: {
//   roomNumber: "A102", 
//   totalBeds: 4,
//   availableBeds: 4,
//   beds: [
//     { bedNumber: "001", isOccupied: false },
//     { bedNumber: "002", isOccupied: false },
//     { bedNumber: "003", isOccupied: false },
//     { bedNumber: "004", isOccupied: false }
//   ]
// }

// Room A103: Uses range format
// Result: {
//   roomNumber: "A103",
//   totalBeds: 3,
//   availableBeds: 3,
//   beds: [
//     { bedNumber: "001", isOccupied: false },
//     { bedNumber: "002", isOccupied: false },
//     { bedNumber: "003", isOccupied: false }
//   ]
// }

// Room B201: Auto-generates bed numbers
// Result: {
//   roomNumber: "B201",
//   totalBeds: 2,
//   availableBeds: 2,
//   beds: [
//     { bedNumber: "001", isOccupied: false },
//     { bedNumber: "002", isOccupied: false }
//   ]
// }

// Room B202: Uses space-separated format
// Result: {
//   roomNumber: "B202",
//   totalBeds: 3,
//   availableBeds: 3,
//   beds: [
//     { bedNumber: "001", isOccupied: false },
//     { bedNumber: "002", isOccupied: false },
//     { bedNumber: "003", isOccupied: false }
//   ]
// }
