import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_PNG_BASE64 } from '../assets/logoBase64';

export interface AgentReportPDFData {
  reportTitle?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  reportingMonth: string;
  agentName: string;
  agentId: string;
  route: string;
  totalCollected: number;
  commissionEarned: number;
  totalTransactions: number;
  transactions: Array<{
    date: string;
    receiptNumber: string;
    customerName: string;
    groupName: string;
    ticketNumber: number | string;
    amountPaid: number;
    paymentMode: string;
    commission: number;
    outstandingBalance: number;
  }>;
}

export interface SubscriberStatementPDFData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  subscriber: {
    name: string;
    address: string;
    city?: string;
    pincode: string;
    phone: string;
    groupNo: string;
    customerId?: string;
  };
  chitDetails: {
    groupId: string;
    groupName: string;
    agentName: string;
    commencementDate: string;
    terminationDate: string;
    chitValue: number;
    monthlyInstallment: number;
  };
  transactions: Array<{
    sNo: number;
    date: string;
    modeOfPayment: string;
    billNo: string;
    collectionAmount: number;
    totalCollection: number;
    dividend: number;
    netTotal: number;
  }>;
  totals: {
    totalCollection: number;
    totalDividend: number;
    netTotal: number;
    transactionCount: number;
  };
}

const formatCurrency = (amount: number) => {
  return (Number.isFinite(amount) ? Math.round(amount) : 0).toLocaleString('en-IN');
};

/**
 * Generate & Download the Agent-Wise Monthly Collection Statement PDF
 */
export function generateAgentMonthlyReportPDF(data: AgentReportPDFData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // 1. Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(data.companyName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (data.companyAddress) {
    doc.text(data.companyAddress, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }
  const contactLine = [
    data.companyPhone ? `Phone: ${data.companyPhone}` : '',
    data.companyEmail ? `Email: ${data.companyEmail}` : ''
  ].filter(Boolean).join(' • ');
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 7;

  // 2. Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const titleText = data.reportTitle || 'AGENT-WISE MONTHLY COLLECTION STATEMENT';
  doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // 3. Summary Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const col1X = 18;
  const col2X = 75;
  const col3X = 135;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Agent Name:', col1X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.agentName, col1X + 24, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Agent ID:', col2X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.agentId, col2X + 18, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Reporting Month:', col3X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.reportingMonth, col3X + 28, currentY + 6);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Route/Area:', col1X, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.route, col1X + 24, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Transactions:', col2X, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.totalTransactions), col2X + 24, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Collected:', col3X, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // green
  doc.text(`INR ${formatCurrency(data.totalCollected)}`, col3X + 28, currentY + 12);

  // Row 3 (Commission)
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Commission Rate:', col1X, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('5.00%', col1X + 28, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Agent Commission (5%):', col2X, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6); // amber
  doc.text(`INR ${formatCurrency(data.commissionEarned)}`, col2X + 40, currentY + 18);

  currentY += 28;

  // 4. Transactions Table
  const tableHeaders = [
    ['S.No', 'Date', 'Receipt #', 'Subscriber Name', 'Route / Group', 'Ticket', 'Mode', 'Amount (INR)', 'Comm (5%)']
  ];

  const tableRows = data.transactions.map((t, idx) => [
    idx + 1,
    t.date,
    t.receiptNumber,
    t.customerName,
    t.groupName,
    `#${t.ticketNumber}`,
    t.paymentMode,
    formatCurrency(t.amountPaid),
    formatCurrency(t.commission)
  ]);

  // Grand totals row
  const tableFooter = [
    [
      { content: 'GRAND TOTALS', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totalCollected), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.commissionEarned), styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableRows,
    foot: tableFooter as any,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [30, 41, 59], // dark slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [203, 213, 225]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { cellWidth: 24 },
      3: { cellWidth: 38 },
      4: { cellWidth: 30 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 22 }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataObj) => {
      // Footer page numbering
      const pageStr = `Page ${dataObj.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      doc.text('This is a system generated document • Jivan Chit Funds', 14, doc.internal.pageSize.getHeight() - 10);
    }
  });

  // 5. Signatures Block on last page
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 16 : currentY + 40;
  if (finalY < doc.internal.pageSize.getHeight() - 35) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    doc.line(18, finalY + 12, 60, finalY + 12);
    doc.text('Prepared By', 28, finalY + 16);

    doc.line(pageWidth / 2 - 25, finalY + 12, pageWidth / 2 + 25, finalY + 12);
    doc.text('Agent Signature', pageWidth / 2 - 12, finalY + 16);

    doc.line(pageWidth - 60, finalY + 12, pageWidth - 18, finalY + 12);
    doc.text('Authorized Signatory', pageWidth - 55, finalY + 16);
  }

  // Clean filename
  const safeAgent = data.agentName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = data.reportingMonth.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Agent_Monthly_Report_${safeAgent}_${safeMonth}.pdf`);
}

/**
 * Generate & Download the Individual Subscriber Statement PDF (Matching Client's Paper Sample)
 */
export function generateSubscriberStatementPDF(data: SubscriberStatementPDFData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // 1. Official Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('JIVAN CHITS SALEM (P) LTD.,', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('MONTHLY COLLECTION STATEMENT', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // 2. Subscriber & Agent Header Block (Exact 2-column layout from client's photo)
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const leftLabelX = 16;
  const leftValX = 36;
  const rightLabelX = 120;
  const rightValX = 148;

  // Line 1: Name & Agent Name
  doc.setFont('helvetica', 'bold');
  doc.text('Name', leftLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subscriber.name, leftValX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Agent Name', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.chitDetails.agentName, rightValX, currentY);
  currentY += 5;

  // Line 2: Address & C.D (Commencement Date)
  doc.setFont('helvetica', 'bold');
  doc.text('Address', leftLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  const fullAddress = [data.subscriber.address, data.subscriber.city].filter(Boolean).join(', ');
  doc.text(fullAddress, leftValX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('C.D', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.chitDetails.commencementDate, rightValX, currentY);
  currentY += 5;

  // Line 3: Pin Code & T.D (Termination Date)
  doc.setFont('helvetica', 'bold');
  doc.text('Pin Code', leftLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subscriber.pincode, leftValX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('T.D', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.chitDetails.terminationDate, rightValX, currentY);
  currentY += 5;

  // Line 4: Ph No & Paid On
  doc.setFont('helvetica', 'bold');
  doc.text('Ph No', leftLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subscriber.phone, leftValX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Paid On', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  const latestDate = data.transactions.length > 0 ? data.transactions[data.transactions.length - 1].date : '-';
  doc.text(latestDate, rightValX, currentY);
  currentY += 5;

  // Line 5: Group No & Amount
  doc.setFont('helvetica', 'bold');
  doc.text('Group No', leftLabelX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(data.subscriber.groupNo, leftValX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Amount', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(data.chitDetails.monthlyInstallment || data.chitDetails.chitValue), rightValX, currentY);
  currentY += 8;

  // 3. Transactions Table (Exact columns from client's photo)
  const tableHeaders = [
    ['Date', 'Mode Of Payment', 'Bill No', 'Collection Amount', 'Total Collection', 'Dividend', 'Net Total']
  ];

  const tableRows = data.transactions.map((t) => [
    t.date,
    t.modeOfPayment,
    t.billNo,
    formatCurrency(t.collectionAmount),
    formatCurrency(t.totalCollection),
    formatCurrency(t.dividend),
    formatCurrency(t.netTotal)
  ]);

  // Grand totals row
  const tableFooter = [
    [
      { content: 'TOTALS', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals.totalCollection), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals.totalCollection), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals.totalDividend), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals.netTotal), styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableRows,
    foot: tableFooter as any,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0], // crisp black lines matching client's sample
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [245, 245, 245], // light grey background matching printed borders
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 }, // Date
      1: { halign: 'left', cellWidth: 32 },   // Mode Of Payment
      2: { halign: 'center', cellWidth: 20 }, // Bill No
      3: { halign: 'right', cellWidth: 28 },  // Collection Amount
      4: { halign: 'right', cellWidth: 28 },  // Total Collection
      5: { halign: 'right', cellWidth: 24 },  // Dividend
      6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' } // Net Total
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataObj) => {
      const pageStr = `Page ${dataObj.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(pageStr, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }
  });

  const safeName = data.subscriber.name.replace(/[^a-zA-Z0-9]/g, '_');
  const safeGroup = data.subscriber.groupNo.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Subscriber_Statement_${safeName}_${safeGroup}.pdf`);
}

export interface ReceiptPDFInput {
  receiptNumber: string;
  paymentDate?: string;
  collectedAt?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  phone?: string;
  groupId?: string;
  groupName?: string;
  chitGroupCode?: string;
  ticketNumber?: number | string;
  monthNumber?: number;
  installmentAmount?: number;
  dividendDeduction?: number;
  netDueAmount?: number;
  amountPaid?: number;
  amountCollected?: number;
  remainingBalance?: number;
  paymentMode?: string;
  paymentMethod?: string;
  transactionReference?: string;
  collectedByName?: string;
  agentName?: string;
  notes?: string;
  remarks?: string;
}

export function numberToWordsINR(amount: number): string {
  const num = Math.floor(Math.max(0, amount));
  if (num === 0) return 'ZERO RUPEES ONLY';

  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'THOUSAND ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'LAKH ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'CRORE ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  return `${inWords(num).trim()} ONLY`;
}

function formatSlipDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-IN');
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generate & Download the Official Payment Receipt Slip PDF
 * Works uniformly across Admin, Staff, and Agent panels
 */
export function generatePaymentReceiptPDF(input: ReceiptPDFInput): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const receiptNo = input.receiptNumber || 'REC-' + Date.now();
  const rawDate = input.paymentDate || input.collectedAt || new Date().toISOString();
  const dateFormatted = formatSlipDate(rawDate);
  const companyName = (input.companyName || 'JIVAN CHIT FUNDS (INDIA) PVT LTD.').toUpperCase();
  const companyAddress = input.companyAddress || 'Regd. Office: 123 Main Street, City Branch • Govt Registered Chit Funds';
  const companyPhone = input.companyPhone || '+91-9876543210';
  const companyEmail = input.companyEmail || 'info@chitfund.com';

  const customerName = (input.customerName || 'Subscriber').toUpperCase();
  const customerId = input.customerId ? ` (${input.customerId})` : '';
  const customerPhone = input.customerMobile || input.phone ? ` • Ph: ${input.customerMobile || input.phone}` : '';
  const groupName = input.groupName || input.chitGroupCode || input.groupId || 'Monthly Chit';
  const groupCode = input.groupId || input.chitGroupCode || '';
  const ticketNo = input.ticketNumber !== undefined ? String(input.ticketNumber) : '1';
  const monthNo = input.monthNumber || 1;

  const amountPaid = Number(input.amountPaid ?? input.amountCollected ?? 0);
  const grossInstallment = Number(input.installmentAmount ?? amountPaid);
  const dividend = Number(input.dividendDeduction ?? 0);
  const remaining = Number(input.remainingBalance ?? 0);
  const mode = String(input.paymentMode || input.paymentMethod || 'Cash').toUpperCase();
  const ref = input.transactionReference || input.notes || '';
  const collector = input.collectedByName || input.agentName || 'Authorized Receiver / Cashier';
  const amountWords = numberToWordsINR(amountPaid);

  // Outer Slip Border Frame (Matching physical chit fund receipt slip)
  const leftX = 14;
  const topY = 14;
  const slipWidth = 182;
  const slipHeight = 188;

  // Double Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.6);
  doc.roundedRect(leftX, topY, slipWidth, slipHeight, 3, 3, 'S');

  doc.setDrawColor(203, 213, 225); // slate-300 inner hairline
  doc.setLineWidth(0.2);
  doc.roundedRect(leftX + 1.5, topY + 1.5, slipWidth - 3, slipHeight - 3, 2, 2, 'S');

  // Embed Official Jivan Golden Emblem Logo Image
  try {
    doc.addImage(LOGO_PNG_BASE64, 'PNG', leftX + 4, topY + 3.5, 16, 16);
  } catch (err) {
    console.error('Failed to add logo image to PDF:', err);
  }

  // Company Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, 37, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(companyAddress, 37, 27.5);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ph: ${companyPhone}  •  Email: ${companyEmail}`, 37, 31.5);

  // Receipt Number & Date (Top-Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('No. ', 155, 23);

  doc.setTextColor(190, 24, 93); // rose-700
  doc.setFontSize(10);
  doc.text(receiptNo, 192, 23, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${dateFormatted}`, 192, 29, { align: 'right' });

  // Divider Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(leftX + 2, 35, leftX + slipWidth - 2, 35);

  // Row 1: Chit Group & Ticket No.
  const r1Y = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(leftX + 3, r1Y, slipWidth - 6, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GR. NO. / SCHEME NAME:', leftX + 6, r1Y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${groupName}${groupCode ? ` (${groupCode})` : ''}`, leftX + 6, r1Y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TICKET NO.:', leftX + slipWidth - 36, r1Y + 4);

  // Ticket badge
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.2);
  doc.roundedRect(leftX + slipWidth - 36, r1Y + 5, 28, 5.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 53, 15); // amber-900
  doc.text(`#${ticketNo}`, leftX + slipWidth - 22, r1Y + 9, { align: 'center' });

  // Row 2: Subscriber & Installment
  const r2Y = 53;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SUBSCRIBER NAME:', leftX + 4, r2Y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${customerName}${customerId}${customerPhone}`, leftX + 4, r2Y + 9);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.15);
  doc.line(leftX + 4, r2Y + 10.5, leftX + 110, r2Y + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INSTALLMENT MONTH:', leftX + 118, r2Y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Month #${monthNo} Installment`, leftX + 118, r2Y + 9);
  doc.line(leftX + 118, r2Y + 10.5, leftX + slipWidth - 4, r2Y + 10.5);

  // Row 3: Rupees in Words
  const r3Y = 67;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RUPEES IN WORDS:', leftX + 4, r3Y + 3.5);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(leftX + 4, r3Y + 5, slipWidth - 8, 8, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(amountWords, leftX + 7, r3Y + 10.5);

  // Financial Breakdown Table
  const tableHeaders = [['DESCRIPTION', 'AMOUNT (INR)']];
  const tableRows: any[] = [
    ['Monthly Gross Installment Amount', `INR ${grossInstallment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
  ];

  if (dividend > 0) {
    tableRows.push([
      'Less: Auction Dividend Credit',
      `-INR ${dividend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);
  }

  tableRows.push([
    { content: 'RECEIVED AMOUNT (INR)', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
    {
      content: `INR ${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      styles: { fontStyle: 'bold', textColor: [4, 120, 87], fillColor: [254, 243, 199] }
    }
  ]);

  autoTable(doc, {
    startY: 84,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: slipWidth - 48 },
      1: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    },
    margin: { left: leftX + 4, right: leftX + 4 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Payment Mode & Outstanding
  const metaY = finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Mode:', leftX + 4, metaY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${mode} ${ref ? `(Ref: ${ref})` : ''}`, leftX + 28, metaY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Remaining Pending Balance:', leftX + slipWidth - 62, metaY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 24, 93); // rose-700
  doc.text(`INR ${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftX + slipWidth - 5, metaY + 3, { align: 'right' });

  // Signatures
  const sigY = metaY + 28;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(leftX + 16, sigY, leftX + 56, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subscriber Signature', leftX + 36, sigY + 4, { align: 'center' });

  // Collector Signature line
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(collector, leftX + slipWidth - 36, sigY - 2, { align: 'center' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(leftX + slipWidth - 56, sigY, leftX + slipWidth - 16, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Receiver / Cashier', leftX + slipWidth - 36, sigY + 4, { align: 'center' });

  // Bottom Footer Notice
  const footY = topY + slipHeight - 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(leftX + 4, footY - 2, leftX + slipWidth - 4, footY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Computer Generated Receipt • Jivan Chit Funds (India) Pvt Ltd • Subject to Salem Jurisdiction', leftX + slipWidth / 2, footY + 1.5, { align: 'center' });

  // Auto trigger download with proper filename
  const safeReceiptNo = receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Receipt_${safeReceiptNo}.pdf`);
}

export interface ArrearsReportPDFData {
  companyName?: string;
  asOnDate: string;
  agentFilterName?: string;
  groupFilterName?: string;
  records: Array<{
    sNo: number;
    groupNo: string;
    name: string;
    cd: string;
    td: string;
    totalPayableAmount: number;
    totalCollectionAmount: number;
    balanceAmount: number;
    lastCollectionDate: string;
    lastCollectionAmount: number;
    phone: string;
    agentName: string;
  }>;
  summary: {
    totalSubscribers: number;
    totalPayableAmount: number;
    totalCollectionAmount: number;
    totalBalanceAmount: number;
    totalLastCollectionAmount: number;
  };
}

export function generateArrearsReportPDF(data: ArrearsReportPDFData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Format currency helper (INR without decimal if .00 or clean formatting)
  const formatINR = (val: number) => {
    return `INR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Centered Header matching Physical Register
  let currentY = 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`ARREARS REPORT AS ON ${data.asOnDate}`, pageWidth / 2, currentY + 4, { align: 'center' });

  currentY += 10;

  // 2. Table Headers (Exact 12 columns in order matching physical register)
  const tableHeaders = [
    [
      'S.NO',
      'GROUP NO',
      'NAME',
      'CD',
      'TD',
      'TOTAL PAYABLE\nAMOUNT',
      'TOTAL COLLECTION\nAMOUNT',
      'BALANCE\nAMOUNT',
      'LAST COLLECTION\nDATE',
      'LASTE COLLECTION\nAMOUNT',
      'PH NO',
      'AGENT NAME'
    ]
  ];

  // Table Body Rows
  const tableRows = data.records.map((r) => [
    String(r.sNo),
    r.groupNo,
    r.name,
    r.cd,
    r.td,
    Number(r.totalPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    Number(r.totalCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    Number(r.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    r.lastCollectionDate,
    Number(r.lastCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    r.phone,
    r.agentName
  ]);

  // Empty placeholder rows matching physical document
  tableRows.push(['', '', '', '', '', '', '', '', '', '', '', '']);
  tableRows.push(['', '', '', '', '', '', '', '', '', '', '', '']);

  // Table Footer Row (Exact totals in monetary columns, TD/Payable spanned for 'Total')
  const tableFooter = [
    [
      { content: 'Total', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: Number(data.summary.totalPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: Number(data.summary.totalCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: Number(data.summary.totalBalanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: { halign: 'center' } },
      { content: Number(data.summary.totalLastCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', colSpan: 2, styles: { halign: 'center' } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableRows,
    foot: tableFooter as any,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },   // S.No
      1: { halign: 'center', cellWidth: 24 },   // Group No
      2: { halign: 'left', cellWidth: 32 },     // Name
      3: { halign: 'center', cellWidth: 19 },   // CD
      4: { halign: 'center', cellWidth: 19 },   // TD
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },  // Total Payable
      6: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },  // Total Collection
      7: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },  // Balance Amount
      8: { halign: 'center', cellWidth: 22 },   // Last Collection Date
      9: { halign: 'right', cellWidth: 23 },    // Last Collection Amount
      10: { halign: 'center', cellWidth: 23 },  // PH No
      11: { halign: 'left', cellWidth: 20 }     // Agent Name
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataObj) => {
      // Bottom footer pagination and verification
      const pageStr = `Page ${dataObj.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
      doc.text('Official Confidential Report • Jivan Chit Funds Management System • Computer Generated Register', 14, pageHeight - 8);
    }
  });

  const safeDate = String(data.asOnDate).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Arrears_Report_As_On_${safeDate}.pdf`);
}

