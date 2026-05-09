import { SHEET_NAMES, COLUMNS } from './config';
import { MOCK_DB } from './mockData';
import { supabase } from './supabase';
import { validateRowUpdate, logProtectionViolation, getProtectedColumns } from './protection';
import { Role } from './types';

// USE_MOCK is now driven by env variable.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

if (USE_MOCK) {
  console.info('📋 Data Mode: MOCK — using built-in sample data.');
} else {
  console.info('⚡ Data Mode: LIVE — connected to Supabase PostgreSQL.');
}

// Map Sheet Names → Supabase Table Names
const TABLE_MAP: Record<string, string> = {
  [SHEET_NAMES.CLIENTS]: 'clients',
  [SHEET_NAMES.WORKFLOW_STATUS]: 'workflow_status',
  [SHEET_NAMES.SURVEYS]: 'surveys',
  [SHEET_NAMES.QUOTATIONS]: 'quotations',
  [SHEET_NAMES.INSTALLATIONS]: 'installations',
  [SHEET_NAMES.SUBSIDIES]: 'subsidies',
  [SHEET_NAMES.PAYMENTS]: 'payments',
  [SHEET_NAMES.DOCUMENTS]: 'documents',
  [SHEET_NAMES.USERS]: 'users',
};

// Map Sheet Columns → DB Columns (in order)
const DB_COLUMNS: Record<string, string[]> = {
  [SHEET_NAMES.CLIENTS]: ['id', 'name', 'phone', 'address', 'roof_type', 'system_size_kw', 'created_date', 'assigned_to'],
  [SHEET_NAMES.WORKFLOW_STATUS]: ['client_id', 'stage', 'updated_at', 'updated_by'],
  [SHEET_NAMES.SURVEYS]: ['client_id', 'survey_date', 'site_images', 'recommended_system_details', 'surveyor_name'],
  [SHEET_NAMES.QUOTATIONS]: ['client_id', 'quotation_pdf', 'amount', 'validity_date', 'approval_status'],
  [SHEET_NAMES.INSTALLATIONS]: ['client_id', 'team_members', 'progress_notes', 'completion_percentage', 'start_date', 'end_date'],
  [SHEET_NAMES.SUBSIDIES]: ['client_id', 'status', 'applied_date', 'approval_date', 'amount'],
  [SHEET_NAMES.PAYMENTS]: ['client_id', 'total_amount', 'paid_amount', 'pending_amount', 'due_date', 'payment_status'],
  [SHEET_NAMES.DOCUMENTS]: ['client_id', 'aadhaar_link', 'electricity_bill_link', 'quotation_doc_link', 'installation_photos_link', 'subsidy_docs_link'],
  [SHEET_NAMES.USERS]: ['email', 'role', 'name', 'active'],
};

// Per-table ordering config (ascending so app-side .reverse() works correctly)
const ORDER_MAP: Record<string, { column: string; ascending: boolean }> = {
  clients: { column: 'created_date', ascending: true },
  workflow_status: { column: 'updated_at', ascending: true },
  users: { column: 'name', ascending: true },
  surveys: { column: 'client_id', ascending: true },
  quotations: { column: 'client_id', ascending: true },
  installations: { column: 'client_id', ascending: true },
  subsidies: { column: 'client_id', ascending: true },
  payments: { column: 'client_id', ascending: true },
  documents: { column: 'client_id', ascending: true },
};

export function setAccessToken(token: string) {
  // Not needed — Supabase client manages its own session token
  console.debug('🔐 Supabase handles its own access token');
}

const LOCAL_BACKUP_PREFIX = 'solarcrm_backup_';

function saveLocalBackup(sheetName: string, data: any[]) {
  try {
    localStorage.setItem(`${LOCAL_BACKUP_PREFIX}${sheetName}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save local backup (storage might be full)', e);
  }
}

function getLocalBackup(sheetName: string): any[] | null {
  try {
    const data = localStorage.getItem(`${LOCAL_BACKUP_PREFIX}${sheetName}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch all rows from a Supabase table, mapped back to Sheet-style headers.
 * Includes automatic local backup and offline fallback.
 */
export async function getSheetData<T = any>(sheetName: string): Promise<T[]> {
  if (USE_MOCK) {
    const data = MOCK_DB[sheetName] || [];
    return JSON.parse(JSON.stringify(data)).map((item: any, i: number) => ({ ...item, _rowIndex: i }));
  }

  const tableName = TABLE_MAP[sheetName];
  if (!tableName) throw new Error(`Unknown sheet: ${sheetName}`);

  const orderConfig = ORDER_MAP[tableName] || { column: 'id', ascending: true };

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order(orderConfig.column, { ascending: orderConfig.ascending });

  if (error) {
    console.error(`Supabase Select Error (${tableName}):`, error);
    
    // OFFLINE FALLBACK: If Supabase fails, try to load from the automatic local backup
    const backup = getLocalBackup(sheetName);
    if (backup) {
      console.warn(`⚠️ Using local backup for ${sheetName} due to network/DB error.`);
      return backup;
    }
    
    throw new Error(`Failed to fetch ${sheetName}: ${error.message}`);
  }

  // Map DB snake_case columns → Sheet 'Header Name' format
  const sheetKey = Object.keys(SHEET_NAMES).find(
    key => SHEET_NAMES[key as keyof typeof SHEET_NAMES] === sheetName
  );
  const sheetHeaders = sheetKey
    ? COLUMNS[sheetKey as keyof typeof COLUMNS]
    : [];
  const dbCols = DB_COLUMNS[sheetName] || [];

  const mappedData = (data || []).map((dbRow: any, i: number) => {
    const item: any = { _rowIndex: i };
    sheetHeaders.forEach((header: string, idx: number) => {
      const dbCol = dbCols[idx];
      let val = dbRow[dbCol];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'boolean') val = val ? 'TRUE' : 'FALSE';
      if (typeof val === 'number') val = String(val);
      item[header] = String(val);
    });
    return item;
  });

  // Automatically save the fresh data to the local backup
  saveLocalBackup(sheetName, mappedData);
  
  return mappedData;
}

/**
 * Convert a value array + column names into a DB insert object with proper types.
 */
function buildDbObject(dbCols: string[], values: any[]): Record<string, any> {
  const obj: Record<string, any> = {};

  dbCols.forEach((col, i) => {
    let val = values[i];

    // Null handling
    if (val === '' || val === undefined) {
      obj[col] = null;
      return;
    }

    // Numeric columns
    if (['amount', 'total_amount', 'paid_amount', 'pending_amount', 'completion_percentage', 'system_size_kw'].includes(col)) {
      const num = Number(val);
      obj[col] = isNaN(num) ? null : num;
      return;
    }

    // Boolean columns
    if (col === 'active') {
      obj[col] = val === 'TRUE' || val === true;
      return;
    }

    obj[col] = val;
  });

  return obj;
}

/**
 * Insert a new row.
 */
export async function appendRow(sheetName: string, values: any[]) {
  if (USE_MOCK) {
    if (!MOCK_DB[sheetName]) MOCK_DB[sheetName] = [];
    const sheetKey = Object.keys(SHEET_NAMES).find(key => SHEET_NAMES[key as keyof typeof SHEET_NAMES] === sheetName);
    const headers = sheetKey ? COLUMNS[sheetKey as keyof typeof COLUMNS] : [];
    const newObj: any = {};
    headers.forEach((h: string, i: number) => {
      newObj[h] = values[i] || '';
    });
    MOCK_DB[sheetName].push(newObj);
    return { status: 200 };
  }

  const tableName = TABLE_MAP[sheetName];
  if (!tableName) throw new Error(`Unknown sheet: ${sheetName}`);

  const dbCols = DB_COLUMNS[sheetName] || [];
  const insertObj = buildDbObject(dbCols, values);

  const { error } = await supabase.from(tableName).insert([insertObj]);

  if (error) {
    console.error(`Supabase Insert Error (${tableName}):`, error);
    throw new Error(`Failed to insert into ${sheetName}: ${error.message}`);
  }

  return { status: 200 };
}

/**
 * Update an existing row. Match strategy depends on the table:
 * - clients → match by 'id'
 * - users → match by 'email'
 * - everything else → match by 'client_id' (unique constraint)
 */
export async function updateRow(sheetName: string, rowIndex: number, values: any[]) {
  if (USE_MOCK) {
    if (!MOCK_DB[sheetName] || !MOCK_DB[sheetName][rowIndex]) return { status: 404 };
    const sheetKey = Object.keys(SHEET_NAMES).find(key => SHEET_NAMES[key as keyof typeof SHEET_NAMES] === sheetName);
    const headers = sheetKey ? COLUMNS[sheetKey as keyof typeof COLUMNS] : [];
    const updatedObj: any = { ...MOCK_DB[sheetName][rowIndex] };
    headers.forEach((h: string, i: number) => {
      updatedObj[h] = values[i] || '';
    });
    MOCK_DB[sheetName][rowIndex] = updatedObj;
    return { status: 200 };
  }

  const tableName = TABLE_MAP[sheetName];
  if (!tableName) throw new Error(`Unknown sheet: ${sheetName}`);

  const dbCols = DB_COLUMNS[sheetName] || [];
  const updateObj = buildDbObject(dbCols, values);

  // Determine which column to use as the primary key for the WHERE clause
  let pkCol: string;
  if (tableName === 'clients') {
    pkCol = 'id';
  } else if (tableName === 'users') {
    pkCol = 'email';
  } else {
    pkCol = 'client_id';
  }

  const pkValue = updateObj[pkCol];
  if (!pkValue) throw new Error(`Cannot update ${sheetName}: missing primary key (${pkCol})`);

  const { error } = await supabase
    .from(tableName)
    .update(updateObj)
    .eq(pkCol, pkValue);

  if (error) {
    console.error(`Supabase Update Error (${tableName}):`, error);
    throw new Error(`Failed to update ${sheetName}: ${error.message}`);
  }

  return { status: 200 };
}

export async function findRowsByColumn<T = any>(sheetName: string, columnName: string, value: string): Promise<T[]> {
  const allData = await getSheetData<T>(sheetName);
  return allData.filter((item: any) => item[columnName] === value);
}

/**
 * Protected API functions that enforce sheet protection rules
 */
export async function updateRowProtected(
  sheetName: string,
  rowIndex: number,
  values: any[],
  userEmail?: string,
  userRole?: Role
) {
  const sheetKey = Object.keys(SHEET_NAMES).find(key => SHEET_NAMES[key as keyof typeof SHEET_NAMES] === sheetName);
  const headers = sheetKey ? COLUMNS[sheetKey as keyof typeof COLUMNS] : [];

  const updates: Record<string, any> = {};
  headers.forEach((h: string, i: number) => {
    if (values[i] !== undefined) {
      updates[h] = values[i];
    }
  });

  const validation = validateRowUpdate(sheetName, updates, userRole);
  if (!validation.valid) {
    const error = validation.errors.join('; ');
    if (userEmail) {
      logProtectionViolation(userEmail, sheetName, headers.join(','), values, userRole);
    }
    throw new Error(`Update denied: ${error}`);
  }

  return updateRow(sheetName, rowIndex, values);
}

export async function appendRowProtected(
  sheetName: string,
  values: any[],
  userEmail?: string,
  userRole?: Role
) {
  const protectedColumns = getProtectedColumns(sheetName);
  if (protectedColumns.length > 0 && userRole && userRole !== 'Admin') {
    if (sheetName === 'Users' || sheetName === 'WORKFLOW_STATUS') {
      throw new Error('You do not have permission to add entries to this sheet');
    }
  }

  return appendRow(sheetName, values);
}
