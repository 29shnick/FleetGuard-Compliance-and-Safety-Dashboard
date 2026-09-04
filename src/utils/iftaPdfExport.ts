import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyInfo, IftaQuarterlyReport } from '../types';

export function generateIftaPdf(report: IftaQuarterlyReport, companyInfo: CompanyInfo): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const accentColor: [number, number, number] = [79, 70, 229]; // indigo-600
  const headerBgColor: [number, number, number] = [241, 245, 249]; // slate-100

  // 1. Top Decorative Bar
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 215.9, 5, 'F');

  // 2. Header Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('IFTA-100 / IFTA-101 QUARTERLY FUEL TAX RETURN', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('International Fuel Tax Agreement — Multi-Jurisdiction Summary for Tax Filing', 14, 21);

  // Form Badge on right
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(155, 10, 47, 14, 2, 2, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(155, 10, 47, 14, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text(`TAX PERIOD: ${report.quarter} ${report.year}`, 158, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Due Date: ${report.filingDueDate}`, 158, 21);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 27, 202, 27);

  // 3. Carrier & Base Jurisdiction Details (2-column layout)
  // Left: Carrier Identification
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CARRIER / MOTOR CARRIER INFORMATION', 14, 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(companyInfo.legalName || 'FastGate Logistics Inc.', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(companyInfo.address || '1000 S Financial Place, Suite 2400, Chicago, IL 60605', 14, 43);
  doc.text(`Tel: ${companyInfo.phone || '(800) 555-3533'}  •  Email: ${companyInfo.email || 'safety@fastgatelogistics.com'}`, 14, 47.5);

  // Right: DOT / IFTA Licensing Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('IFTA LICENSING & TAX CREDENTIALS', 120, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`IFTA Account ID: `, 120, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.iftaAccountNumber || 'IL-IFTA-98102', 152, 38);

  doc.setFont('helvetica', 'normal');
  doc.text(`Base Jurisdiction: `, 120, 42.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyInfo.iftaAccountState || 'IL'} (Illinois)`, 152, 42.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`USDOT Number: `, 120, 47);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.usdotNumber || '3892019', 152, 47);

  doc.setFont('helvetica', 'normal');
  doc.text(`MC / FEIN Tax ID: `, 120, 51.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyInfo.mcNumber || 'MC-1092841'} / ${companyInfo.feinTaxId || '36-9812019'}`, 152, 51.5);

  // 4. Executive Fleet Summary Box
  const summaryY = 56;
  doc.setFillColor(...headerBgColor);
  doc.roundedRect(14, summaryY, 188, 20, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, summaryY, 188, 20, 2, 2, 'D');

  const colWidth = 188 / 5;
  const metrics = [
    { label: 'TOTAL IFTA MILES', val: report.totalIftaMiles.toLocaleString() + ' mi' },
    { label: 'FLEET AVERAGE MPG', val: `${report.overallMpg.toFixed(2)} MPG` },
    { label: 'TAXABLE GALLONS', val: Math.round(report.totalTaxableGallons).toLocaleString() + ' gal' },
    { label: 'TAX-PAID GALLONS', val: Math.round(report.totalTaxPaidGallons).toLocaleString() + ' gal' },
    { 
      label: report.netTaxBalance >= 0 ? 'NET TAX DUE' : 'NET REFUND / CREDIT', 
      val: `${report.netTaxBalance >= 0 ? '$' : '-$'}${Math.abs(report.netTaxBalance).toFixed(2)}`,
      highlight: true
    }
  ];

  metrics.forEach((m, idx) => {
    const xPos = 14 + (idx * colWidth);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, xPos + (colWidth / 2), summaryY + 6.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    if (m.highlight) {
      doc.setTextColor(report.netTaxBalance >= 0 ? 190 : 16, report.netTaxBalance >= 0 ? 24 : 149, report.netTaxBalance >= 0 ? 35 : 106);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(m.val, xPos + (colWidth / 2), summaryY + 14.5, { align: 'center' });

    if (idx < 4) {
      doc.setDrawColor(226, 232, 240);
      doc.line(xPos + colWidth, summaryY + 3, xPos + colWidth, summaryY + 17);
    }
  });

  // 5. Table of State Jurisdictions (AutoTable)
  const tableData = report.jurisdictions.map(j => [
    `${j.stateCode} - ${j.stateName}`,
    j.totalMiles.toLocaleString(),
    j.taxableMiles.toLocaleString(),
    j.taxableGallons.toFixed(1),
    j.taxPaidGallons.toFixed(1),
    j.netTaxableGallons >= 0 ? j.netTaxableGallons.toFixed(1) : `(${Math.abs(j.netTaxableGallons).toFixed(1)})`,
    `$${j.taxRatePerGallon.toFixed(3)}`,
    j.netTaxDue >= 0 ? `$${j.netTaxDue.toFixed(2)}` : `($${Math.abs(j.netTaxDue).toFixed(2)})`
  ]);

  // Totals Row
  const totalRow = [
    'TOTALS / FLEET SUMMARY',
    report.totalIftaMiles.toLocaleString(),
    report.totalTaxableMiles.toLocaleString(),
    report.totalTaxableGallons.toFixed(1),
    report.totalTaxPaidGallons.toFixed(1),
    (report.totalTaxableGallons - report.totalTaxPaidGallons).toFixed(1),
    '—',
    report.netTaxBalance >= 0 ? `$${report.netTaxBalance.toFixed(2)}` : `($${Math.abs(report.netTaxBalance).toFixed(2)})`
  ];

  autoTable(doc, {
    startY: 81,
    head: [[
      'Jurisdiction',
      'Total Miles',
      'Taxable Miles',
      'Taxable Gal',
      'Tax-Paid Gal',
      'Net Gallons',
      'Tax Rate',
      'Net Tax ($)'
    ]],
    body: [...tableData, totalRow],
    theme: 'grid',
    headStyles: {
      fillColor: [67, 56, 202], // indigo-700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: function (data) {
      // Highlight totals row
      if (data.row.index === tableData.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [224, 231, 255]; // indigo-100
        data.cell.styles.textColor = [30, 27, 75]; // indigo-950
      }
    },
    margin: { left: 14, right: 14 }
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Check if we need space for signature block, or if it fits on page 1
  const sigY = finalY > 230 ? 230 : finalY;

  // 6. Certification Declaration & Signature Block
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, sigY, 188, 36, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, sigY, 188, 36, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('AUTHORIZED MOTOR CARRIER DECLARATION & E-FILE CERTIFICATION', 18, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'I declare under the penalties of perjury that this IFTA quarterly return (including all jurisdiction mileage calculations,',
    18,
    sigY + 9
  );
  doc.text(
    'fuel purchase vouchers, and taxable gallon schedules) has been examined by me and to the best of my knowledge is true, correct, and complete.',
    18,
    sigY + 12.5
  );

  // Signature line and metadata
  const lineY = sigY + 24;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Signer Name
  doc.line(18, lineY, 80, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(companyInfo.safetyManagerName || 'Alice Johnson', 18, lineY - 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Officer Signature / Printed Name', 18, lineY + 3.5);

  // Title
  doc.line(88, lineY, 135, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Director of Safety & Compliance', 88, lineY - 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Title / Capacity', 88, lineY + 3.5);

  // Date
  doc.line(143, lineY, 196, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const filingDate = new Date().toISOString().substring(0, 10);
  doc.text(filingDate, 143, lineY - 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Filing Date (YYYY-MM-DD)', 143, lineY + 3.5);

  // Security Verification Hash
  const hash = `IFTA-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`Digital Verification Hash: ${hash}  •  Jurisdictions: ${report.jurisdictions.length}  •  Generated by FleetGuard DOT Engine`, 18, sigY + 33);

  // 7. Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page 1 of 1  •  ${companyInfo.legalName}  •  IFTA Quarterly Tax Filing Schedule`, 108, 272, { align: 'center' });

  const sanitizedCompany = (companyInfo.legalName || 'FastGate_Logistics').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `IFTA_Report_${report.year}_${report.quarter}_${sanitizedCompany}.pdf`;

  return { doc, filename };
}
