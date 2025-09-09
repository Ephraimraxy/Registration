import jsPDF from 'jspdf';
import { User } from '@shared/schema';

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
