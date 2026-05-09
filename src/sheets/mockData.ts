import { SHEET_NAMES } from './config';

// ─── Deterministic pseudo-random (seeded) ────────────────────────────────────
// Using a simple seeded random to keep mock data stable across page reloads.
function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}
const rng = seededRandom(42); // fixed seed — same data every time

function ri(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randomDate(start: Date, end: Date) {
  const t = start.getTime() + rng() * (end.getTime() - start.getTime());
  return new Date(t);
}

// ─── Reference data ───────────────────────────────────────────────────────────
const firstNames = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Shaurya','Atharv','Advik','Pranav','Rian','Kabir','Rudra','Aryan','Dhruv','Siddharth','Diya','Pari','Anushka','Avni','Aadhya','Kriti','Myra','Ananya','Aaradhya','Kiara','Saanvi','Prisha','Riya','Aanya','Sara','Jiya','Tara','Kavya','Navya','Isha','Siya','Nitya','Anvi','Ahana'];
const lastNames  = ['Patel','Sharma','Singh','Deshmukh','Rao','Kumar','Reddy','Das','Chatterjee','Iyer','Menon','Nair','Bose','Gupta','Joshi','Kapoor','Kaur','Mehta','Mishra','Pandey','Saxena','Shah','Verma','Yadav','Trivedi','Agarwal','Chauhan','Dixit','Jain','Garg','Chopra','Malhotra','Sethi'];
const addresses  = ['M.G. Road','Link Road','Outer Ring Road','Park Street','FC Road','Kalyani Nagar','Indiranagar','Juhu','Bandra','Connaught Place','Vasant Kunj','Salt Lake','Gachibowli','Banjara Hills','Marina Beach','Anna Nagar'];
const stages     = ['Lead','Survey Scheduled','Survey Done','Quotation Sent','Quotation Approved','Installation Started','Installation Completed','Subsidy Applied','Subsidy Received','Project Closed'];
const roofTypes  = ['Flat','Sloped','Mixed'];
const sysSizes   = ['3','5','8','10','15','20'];

// ─── Fixed date anchors (relative to a fixed point in time) ──────────────────
const BASE_DATE   = new Date('2025-11-01T00:00:00Z');
const END_DATE    = new Date('2026-04-30T00:00:00Z');

// ─── Build the mock database ──────────────────────────────────────────────────
export const MOCK_DB: Record<string, any[]> = {
  [SHEET_NAMES.USERS]: [
    { Email: 'hfj1887@gmail.com',      Role: 'Admin',      Name: 'Himanshu Shukla', Active: 'TRUE' },
    { Email: 'admin@solar.com',        Role: 'Admin',      Name: 'John Doe',        Active: 'TRUE' },
    { Email: 'sales@solar.com',        Role: 'Sales Team', Name: 'Alice Sales',     Active: 'TRUE' },
    { Email: 'engineer@solar.com',     Role: 'Engineer',   Name: 'Bob Builder',     Active: 'TRUE' },
    { Email: 'accountant@solar.com',   Role: 'Accountant', Name: 'Cathy Coin',      Active: 'TRUE' },
  ],
  [SHEET_NAMES.CLIENTS]:          [],
  [SHEET_NAMES.WORKFLOW_STATUS]:  [],
  [SHEET_NAMES.SURVEYS]:          [],
  [SHEET_NAMES.QUOTATIONS]:       [],
  [SHEET_NAMES.INSTALLATIONS]:    [],
  [SHEET_NAMES.SUBSIDIES]:        [],
  [SHEET_NAMES.PAYMENTS]:         [],
  [SHEET_NAMES.DOCUMENTS]:        [],
};

for (let i = 0; i < 50; i++) {
  const id         = `C${(i + 1).toString().padStart(3, '0')}`;
  const name       = `${pick(firstNames)} ${pick(lastNames)}`;
  const phone      = `9${ri(10000000, 99999999)}`;
  const address    = `${ri(1, 999)}, ${pick(addresses)}`;
  const roofType   = pick(roofTypes);
  const systemSize = pick(sysSizes);
  const createdObj = randomDate(BASE_DATE, END_DATE);
  const createdDate = createdObj.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });

  MOCK_DB[SHEET_NAMES.CLIENTS].push({
    'ID': id, 'Name': name, 'Phone': phone, 'Address': address,
    'Roof Type': roofType, 'System Size (kW)': systemSize,
    'Created Date': createdDate,
    'Assigned To': pick(['sales@solar.com','admin@solar.com']),
  });

  const stageIdx    = rng() > 0.8 ? 9 : ri(0, stages.length - 1);
  const currentStage = stages[stageIdx];
  let lastUpdateObj  = createdObj;

  for (let s = 0; s <= stageIdx; s++) {
    lastUpdateObj = randomDate(lastUpdateObj, END_DATE);
    MOCK_DB[SHEET_NAMES.WORKFLOW_STATUS].push({
      'Client ID': id, 'Stage': stages[s],
      'Updated At': lastUpdateObj.toISOString(),
      'Updated By': pick(['admin@solar.com','sales@solar.com','engineer@solar.com']),
    });
  }

  if (stageIdx >= 2) {
    MOCK_DB[SHEET_NAMES.SURVEYS].push({
      'Client ID': id,
      'Survey Date': new Date(createdObj.getTime() + 86400000 * 2).toISOString().split('T')[0],
      'Site Images': 'https://drive.google.com/survey-images',
      'Recommended System Details': `${systemSize}kW system with premium panels`,
      'Surveyor Name': 'Bob Builder',
    });
  }

  if (stageIdx >= 3) {
    MOCK_DB[SHEET_NAMES.QUOTATIONS].push({
      'Client ID': id,
      'Quotation PDF': 'https://drive.google.com/quotation',
      'Amount (₹)': (parseInt(systemSize) * 50000).toString(),
      'Validity Date': new Date(createdObj.getTime() + 86400000 * 30).toISOString().split('T')[0],
      'Approval Status': stageIdx >= 4 ? 'Approved' : 'Pending',
    });
  }

  if (stageIdx >= 5) {
    MOCK_DB[SHEET_NAMES.INSTALLATIONS].push({
      'Client ID': id,
      'Team Members': 'Team Alpha, Team Beta',
      'Progress Notes': stageIdx >= 6 ? 'Completed successfully' : 'In progress',
      'Completion %': stageIdx >= 6 ? '100' : ri(10, 90).toString(),
      'Start Date': new Date(createdObj.getTime() + 86400000 * 15).toISOString().split('T')[0],
      'End Date':   stageIdx >= 6 ? new Date(createdObj.getTime() + 86400000 * 20).toISOString().split('T')[0] : '',
    });
  }

  if (stageIdx >= 7) {
    const subStatus = stageIdx === 9 ? 'Received' : (stageIdx === 8 ? 'Approved' : pick(['Applied','Under Review']));
    MOCK_DB[SHEET_NAMES.SUBSIDIES].push({
      'Client ID': id, 'Status': subStatus,
      'Applied Date': new Date(createdObj.getTime() + 86400000 * 25).toISOString().split('T')[0],
      'Approval Date': ['Approved','Received'].includes(subStatus)
        ? new Date(createdObj.getTime() + 86400000 * 40).toISOString().split('T')[0] : '',
      'Amount (₹)': (parseInt(systemSize) * 15000).toString(),
    });
  }

  const totalAmount = parseInt(systemSize) * 50000;
  let paidAmount    = 0;
  let payStatus     = 'Pending';
  if (stageIdx >= 4 && stageIdx <= 5) { paidAmount = totalAmount * 0.3; payStatus = 'Partial'; }
  else if (stageIdx >= 6)              { paidAmount = totalAmount;       payStatus = 'Paid'; }

  const dueDateObj = randomDate(createdObj, new Date(createdObj.getTime() + 86400000 * 60));
  if ((payStatus === 'Pending' || payStatus === 'Partial') && dueDateObj < new Date()) {
    payStatus = 'Overdue';
  }

  MOCK_DB[SHEET_NAMES.PAYMENTS].push({
    'Client ID': id,
    'Total Amount (₹)':   totalAmount.toString(),
    'Paid Amount (₹)':    paidAmount.toString(),
    'Pending Amount (₹)': (totalAmount - paidAmount).toString(),
    'Due Date': dueDateObj.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }),
    'Payment Status': payStatus,
  });

  MOCK_DB[SHEET_NAMES.DOCUMENTS].push({
    'Client ID': id,
    'Aadhaar Link':           'https://drive.google.com/aadhaar',
    'Electricity Bill Link':  'https://drive.google.com/bill',
    'Quotation Doc Link':     stageIdx >= 3 ? 'https://drive.google.com/quote' : '',
    'Installation Photos Link': stageIdx >= 5 ? 'https://drive.google.com/photos' : '',
    'Subsidy Docs Link':      stageIdx >= 7 ? 'https://drive.google.com/subsidy' : '',
  });
}
