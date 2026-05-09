import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createBackupSnapshot,
  getAllBackups,
  exportBackupAsJSON,
  exportBackupAsCSV,
  deleteBackup,
  getBackupMetadata,
  BackupSnapshot,
} from '../sheets/backup';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from 'sonner';
import { Trash2, Download, RotateCcw, Save } from 'lucide-react';

export default function BackupManager() {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    setBackups(getAllBackups());
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const backup = await createBackupSnapshot(user?.email || 'Manual');
      setBackups([backup, ...backups]);
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = (id: string) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      deleteBackup(id);
      setBackups(backups.filter(b => b.id !== id));
      toast.success('Backup deleted');
    }
  };

  const handleExportJSON = (backup: BackupSnapshot) => {
    exportBackupAsJSON(backup);
    toast.success('Backup exported as JSON');
  };

  const handleExportCSV = (backup: BackupSnapshot) => {
    exportBackupAsCSV(backup);
    toast.success('Backup exported as CSV');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleCreateBackup}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create Backup Now'}
            </Button>
            <p className="text-sm text-gray-600 self-center">
              Auto-backups run hourly. Last {backups.length} backups stored locally.
            </p>
          </div>
        </CardContent>
      </Card>

      {backups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No backups yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Backup History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backups.map((backup) => {
                const meta = getBackupMetadata(backup);
                const date = new Date(backup.timestamp);
                return (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        By: {meta.createdBy} • {Object.keys(meta.sheetCounts).length} sheets • ~{(meta.sizeEstimate / 1024).toFixed(1)}KB
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportJSON(backup)}
                        title="Export as JSON"
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportCSV(backup)}
                        title="Export as CSV"
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <strong>Note:</strong> Backups are stored in your browser's local storage. Export to JSON for external storage.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
