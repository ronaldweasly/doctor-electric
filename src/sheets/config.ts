export const SHEET_NAMES = {
  CLIENTS: 'Clients',
  WORKFLOW_STATUS: 'WorkflowStatus',
  SURVEYS: 'Surveys',
  QUOTATIONS: 'Quotations',
  INSTALLATIONS: 'Installations',
  SUBSIDIES: 'Subsidies',
  PAYMENTS: 'Payments',
  DOCUMENTS: 'Documents',
  USERS: 'Users',
};

export const COLUMNS = {
  CLIENTS: ['ID', 'Name', 'Phone', 'Address', 'Roof Type', 'System Size (kW)', 'Created Date', 'Assigned To'],
  WORKFLOW_STATUS: ['Client ID', 'Stage', 'Updated At', 'Updated By'],
  SURVEYS: ['Client ID', 'Survey Date', 'Site Images', 'Recommended System Details', 'Surveyor Name'],
  QUOTATIONS: ['Client ID', 'Quotation PDF', 'Amount (₹)', 'Validity Date', 'Approval Status'],
  INSTALLATIONS: ['Client ID', 'Team Members', 'Progress Notes', 'Completion %', 'Start Date', 'End Date'],
  SUBSIDIES: ['Client ID', 'Status', 'Applied Date', 'Approval Date', 'Amount (₹)'],
  PAYMENTS: ['Client ID', 'Total Amount (₹)', 'Paid Amount (₹)', 'Pending Amount (₹)', 'Due Date', 'Payment Status'],
  DOCUMENTS: ['Client ID', 'Aadhaar Link', 'Electricity Bill Link', 'Quotation Doc Link', 'Installation Photos Link', 'Subsidy Docs Link'],
  USERS: ['Email', 'Role', 'Name', 'Active'],
};
