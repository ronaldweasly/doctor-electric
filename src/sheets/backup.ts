import { getSheetData } from './api';
import { SHEET_NAMES } from './config';

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  version: number;
  sheets: Record<string, any[]>;
  createdBy?: string;
}

const BACKUP_STORAGE_KEY = 'solar_crm_backups';
const MAX_BACKUPS = 10; // Keep last 10 backups
const AUTO_BACKUP_INTERVAL = 3600000; // 1 hour in ms

/**
 * Create a full snapshot backup of all sheets
 */
export async function createBackupSnapshot(createdBy?: string): Promise<BackupSnapshot> {
  const sheets: Record<string, any[]> = {};
  
  // Backup all critical sheets
  const sheetNames = Object.values(SHEET_NAMES);
  
  for (const sheetName of sheetNames) {
    try {
      sheets[sheetName] = await getSheetData(sheetName);
    } catch (error) {
      console.error(`Failed to backup sheet ${sheetName}:`, error);
      sheets[sheetName] = [];
    }
  }

  const backup: BackupSnapshot = {
    id: `backup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    version: 1,
    sheets,
    createdBy,
  };

  saveBackupToStorage(backup);
  return backup;
}

/**
 * Save backup to browser localStorage
 */
function saveBackupToStorage(backup: BackupSnapshot) {
  try {
    const existing = getAllBackups();
    const updated = [backup, ...existing].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save backup to storage:', error);
  }
}

/**
 * Get all stored backups
 */
export function getAllBackups(): BackupSnapshot[] {
  try {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve backups:', error);
    return [];
  }
}

/**
 * Get a specific backup by ID
 */
export function getBackupById(id: string): BackupSnapshot | null {
  const backups = getAllBackups();
  return backups.find(b => b.id === id) || null;
}

/**
 * Delete a backup
 */
export function deleteBackup(id: string) {
  try {
    const backups = getAllBackups();
    const updated = backups.filter(b => b.id !== id);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete backup:', error);
  }
}

/**
 * Export backup as JSON file (for external storage)
 */
export function exportBackupAsJSON(backup: BackupSnapshot) {
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `solar_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export backup as CSV (human-readable)
 */
export function exportBackupAsCSV(backup: BackupSnapshot) {
  let csv = `# DOCTOR ELECTRIC CRM Backup - ${backup.timestamp}\n# Created by: ${backup.createdBy || 'System'}\n\n`;

  for (const [sheetName, rows] of Object.entries(backup.sheets)) {
    if (rows.length === 0) continue;

    csv += `## Sheet: ${sheetName}\n`;
    
    // Get headers from first row
    const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
    csv += headers.map(h => `"${h}"`).join(',') + '\n';

    // Add rows
    rows.forEach(row => {
      csv += headers.map(h => {
        const val = row[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    });

    csv += '\n';
  }

  const dataBlob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `solar_crm_backup_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get backup metadata (size, sheet counts, etc)
 */
export function getBackupMetadata(backup: BackupSnapshot) {
  const sheetCounts = Object.entries(backup.sheets).reduce(
    (acc, [name, rows]) => ({ ...acc, [name]: rows.length }),
    {}
  );

  return {
    id: backup.id,
    timestamp: backup.timestamp,
    createdBy: backup.createdBy || 'System',
    totalSheets: Object.keys(backup.sheets).length,
    sheetCounts,
    sizeEstimate: JSON.stringify(backup).length,
  };
}

/**
 * Initialize auto-backup interval (call once in app startup)
 */
export function initializeAutoBackup(createdBy?: string) {
  // Initial backup
  createBackupSnapshot(createdBy || 'Auto');

  // Then every interval
  setInterval(() => {
    createBackupSnapshot(createdBy || 'Auto');
  }, AUTO_BACKUP_INTERVAL);
}

/**
 * Cleanup old backups (keep only recent ones)
 */
export function cleanupOldBackups() {
  const backups = getAllBackups();
  if (backups.length > MAX_BACKUPS) {
    const kept = backups.slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(kept));
  }
}

/**
 * Get backup statistics
 */
export function getBackupStats() {
  const backups = getAllBackups();
  if (backups.length === 0) {
    return { count: 0, oldestBackup: null, newestBackup: null };
  }

  return {
    count: backups.length,
    oldestBackup: backups[backups.length - 1],
    newestBackup: backups[0],
    totalSize: backups.reduce((sum, b) => sum + JSON.stringify(b).length, 0),
  };
}
