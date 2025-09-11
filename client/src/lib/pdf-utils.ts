import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { User } from '@shared/schema';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateUserDetailsPDF(user: User): void {
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
    
    const details = [
      [`Full Name:`, `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim()],
      [`Date of Birth:`, new Date(user.dob).toLocaleDateString()],
      [`Gender:`, user.gender],
      [`Phone Number:`, user.phone],
      [`Email Address:`, user.email],
      [`State of Origin:`, user.stateOfOrigin],
      [`Local Government Area:`, user.lga],
      [`Room Number:`, user.roomNumber || 'Not assigned'],
      [`Tag Number:`, user.tagNumber || 'Not assigned'],
      [`Registration Date:`, user.createdAt.toLocaleDateString()],
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
    const fileName = `${user.firstName}_${user.surname}_registration_details.pdf`.replace(/\s+/g, '_');
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

export function exportUsersToPDF(users: User[]): void {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243);
    doc.text('REGISTRATION MANAGEMENT SYSTEM', 20, 20);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Complete Users Registration Report', 20, 30);
    
    // Prepare table data
    const tableData = users.map((user, index) => [
      index + 1,
      `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim(),
      user.gender,
      user.phone,
      user.email,
      user.stateOfOrigin,
      user.lga,
      user.roomNumber || 'Not assigned',
      user.tagNumber || 'Not assigned',
      user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : '',
    ]);
    
    // Generate table
    doc.autoTable({
      head: [['#', 'Full Name', 'Gender', 'Phone', 'Email', 'State', 'LGA', 'Room', 'Tag', 'Reg. Date']],
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
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { halign: 'center', cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { halign: 'center', cellWidth: 15 },
        8: { halign: 'center', cellWidth: 15 },
        9: { halign: 'center', cellWidth: 20 },
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
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}
