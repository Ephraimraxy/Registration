import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { User } from '@shared/schema';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateUserDetailsPDF(user: User, exportType: 'full' | 'summary' = 'full'): void {
  try {
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243); // Primary blue
    doc.text('REGISTRATION MANAGEMENT SYSTEM', 20, 30);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Registration Details', 20, 45);
    
    // User details
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    // Helper function to safely format dates
    const formatDate = (date: any): string => {
      if (!date) return 'Not provided';
      try {
        if (date instanceof Date) return date.toLocaleDateString();
        return new Date(date).toLocaleDateString();
      } catch {
        return 'Invalid date';
      }
    };
    
    // Different details based on export type
    const details = exportType === 'summary' 
      ? [
          [`Full Name:`, `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim() || 'Not provided'],
          [`Gender:`, user.gender || 'Not provided'],
          [`Room & Bed:`, `${user.roomNumber || 'Not assigned'}${user.bedNumber ? ` (Bed ${user.bedNumber})` : ''}`],
          [`Tag Number:`, user.tagNumber || 'Not assigned'],
          [`Registration Date:`, formatDate(user.createdAt)],
        ]
      : [
          [`Full Name:`, `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim() || 'Not provided'],
          [`Date of Birth:`, formatDate(user.dob)],
          [`Gender:`, user.gender || 'Not provided'],
          [`Phone Number:`, user.phone || 'Not provided'],
          [`Email Address:`, user.email || 'Not provided'],
          [`National ID (NIN):`, user.nin || 'Not provided'],
          [`State of Origin:`, user.stateOfOrigin || 'Not provided'],
          [`Local Government Area:`, user.lga || 'Not provided'],
          [`Room & Bed:`, `${user.roomNumber || 'Not assigned'}${user.bedNumber ? ` (Bed ${user.bedNumber})` : ''}`],
          [`Tag Number:`, user.tagNumber || 'Not assigned'],
          [`Registration Date:`, formatDate(user.createdAt)],
        ];
    
    let yPosition = 65;
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, yPosition);
      yPosition += 12;
    });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('This document was generated automatically by the REGISTRATION MANAGEMENT SYSTEM.', 20, 200);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 210);
    
    // Save the PDF
    const fileName = `${user.firstName}_${user.surname}_registration_${exportType}.pdf`.replace(/\s+/g, '_');
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

export function exportUsersToPDF(users: User[], exportType: 'full' | 'summary' = 'full'): void {
  try {
    if (!users || users.length === 0) {
      throw new Error('No users data available for export');
    }
    
    // Sort users by tag number serially (TAG-001, TAG-002, etc.)
    const sortedUsers = [...users].sort((a, b) => {
      const tagA = a.tagNumber || '';
      const tagB = b.tagNumber || '';
      
      // Extract numeric part from tag numbers for proper sorting
      const numA = parseInt(tagA.replace(/\D/g, '')) || 0;
      const numB = parseInt(tagB.replace(/\D/g, '')) || 0;
      
      return numA - numB;
    });

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243);
    doc.text('REGISTRATION MANAGEMENT SYSTEM', 20, 20);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const reportType = exportType === 'summary' ? 'Summary' : 'Complete';
    doc.text(`${reportType} Users Registration Report (${sortedUsers.length} users)`, 20, 30);
    
    // Helper function to safely format dates
    const formatDate = (date: any): string => {
      if (!date) return 'Not provided';
      try {
        if (date instanceof Date) return date.toLocaleDateString();
        return new Date(date).toLocaleDateString();
      } catch {
        return 'Invalid date';
      }
    };
    
    // Prepare table data with null safety based on export type
    let tableData, tableHeaders;
    
    if (exportType === 'summary') {
      // Summary format - only essential fields
      tableData = sortedUsers.map((user, index) => [
        index + 1,
        `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim() || 'Not provided',
        user.gender || 'Not provided',
        user.roomNumber || 'Not assigned',
        user.tagNumber || 'Not assigned',
        user.stateOfOrigin || 'Not provided',
        user.phone || 'Not provided',
        user.email || 'Not provided',
        user.specialization || 'Not selected',
      ]);
      tableHeaders = [['#', 'Name', 'Gender', 'Room', 'Tag', 'State', 'Phone', 'Email', 'Specialization']];
    } else {
      // Full format - all fields
      tableData = sortedUsers.map((user, index) => [
        index + 1,
        `${user.firstName || ''} ${user.middleName || ''} ${user.surname || ''}`.trim() || 'Not provided',
        user.gender || 'Not provided',
        user.phone || 'Not provided',
        user.email || 'Not provided',
        user.nin || 'Not provided',
        user.stateOfOrigin || 'Not provided',
        user.lga || 'Not provided',
        (user as any).wing || 'Not assigned',
        user.roomNumber || 'Not assigned',
        user.bedNumber || 'Not assigned',
        user.roomStatus || 'Not assigned',
        user.tagNumber || 'Not assigned',
        user.tagStatus || 'Not assigned',
        user.specialization || 'Not selected',
        (user as any).isVip ? 'Yes' : 'No',
        formatDate(user.createdAt),
      ]);
      tableHeaders = [['#', 'Full Name', 'Gender', 'Phone', 'Email', 'NIN', 'State', 'LGA', 'Wing', 'Room', 'Bed', 'Room Status', 'Tag', 'Tag Status', 'Specialization', 'VIP', 'Reg. Date']];
    }
    
    // Generate table
    doc.autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [33, 150, 243],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles: exportType === 'summary' ? {
        // Summary format column styles
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 40 },
        8: { cellWidth: 30 },
      } : {
        // Full format column styles
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 30 },
        2: { halign: 'center', cellWidth: 12 },
        3: { cellWidth: 20 },
        4: { cellWidth: 35 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 15 },
        8: { halign: 'center', cellWidth: 10 },
        9: { halign: 'center', cellWidth: 12 },
        10: { halign: 'center', cellWidth: 12 },
        11: { halign: 'center', cellWidth: 12 },
        12: { halign: 'center', cellWidth: 12 },
        13: { halign: 'center', cellWidth: 12 },
        14: { cellWidth: 25 },
        15: { halign: 'center', cellWidth: 8 },
        16: { halign: 'center', cellWidth: 18 },
      },
      margin: { left: 20, right: 20 },
    });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, doc.internal.pageSize.height - 5);
    }
    
    // Save the PDF
    const fileName = `users_export_${exportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}
