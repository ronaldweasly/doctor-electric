import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import {
  getAllActivityLogs,
  filterActivityLogs,
  getActivityStats,
  exportActivityLogsAsCSV,
  exportActivityLogsAsJSON,
  cleanupOldActivityLogs,
  getActionDescription,
  getActionColor,
  ActivityLog,
  ActivityAction,
} from '../sheets/activity';
import { Download, Trash2 } from 'lucide-react';

export default function ActivityViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [sheetFilter, setSheetFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<ActivityAction | ''>('');
  const [statusFilter, setStatusFilter] = useState<'success' | 'failed' | ''>('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, userFilter, sheetFilter, actionFilter, statusFilter]);

  const loadLogs = () => {
    const allLogs = getAllActivityLogs();
    setLogs(allLogs);
  };

  const applyFilters = () => {
    const filters: any = {};

    if (userFilter) filters.userId = userFilter;
    if (sheetFilter) filters.sheet = sheetFilter;
    if (actionFilter) filters.action = actionFilter;
    if (statusFilter) filters.status = statusFilter;

    const filtered = Object.keys(filters).length > 0 ? filterActivityLogs(filters) : logs;
    setFilteredLogs(filtered);
  };

  const handleExportCSV = () => {
    exportActivityLogsAsCSV(filteredLogs);
  };

  const handleExportJSON = () => {
    exportActivityLogsAsJSON(filteredLogs);
  };

  const handleCleanup = () => {
    if (
      window.confirm(
        'This will delete activity logs older than 90 days. Continue?'
      )
    ) {
      setLoading(true);
      try {
        const deleted = cleanupOldActivityLogs(90);
        loadLogs();
        alert(`Deleted ${deleted} old log entries`);
      } finally {
        setLoading(false);
      }
    }
  };

  const stats = getActivityStats(7);
  const sheets = Array.from(new Set(logs.map(l => l.sheet))).sort();
  const users = Array.from(new Set(logs.map(l => l.userEmail))).sort();
  const actions = Array.from(
    new Set(logs.map(l => l.action))
  ) as ActivityAction[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-xs text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-xs text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
            </div>
            <div className="p-3 bg-red-50 rounded">
              <p className="text-xs text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-xs text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.byUser).length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-4">
            <Input
              placeholder="Filter by user email"
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="text-sm"
            />
            <Select
              value={sheetFilter}
              onChange={e => setSheetFilter(e.target.value)}
              options={[
                { label: '— Any Sheet —', value: '' },
                ...sheets.map(s => ({ label: s, value: s })),
              ]}
            />
            <Select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value as ActivityAction | '')}
              options={[
                { label: '— Any Action —', value: '' },
                ...actions.map(a => ({ label: getActionDescription(a), value: a })),
              ]}
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'success' | 'failed' | '')}
              options={[
                { label: '— Any Status —', value: '' },
                { label: 'Success', value: 'success' },
                { label: 'Failed', value: 'failed' },
              ]}
            />
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportJSON}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCleanup}
              disabled={loading}
              className="gap-1 text-blue-700 hover:text-blue-800 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-600 uppercase">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Sheet</th>
                  <th className="px-4 py-3 text-left">Record</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice(0, 50).map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{log.userEmail}</td>
                      <td className="px-4 py-3">
                        <Badge className={getActionColor(log.action)}>
                          {getActionDescription(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.sheet}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {log.recordName || log.recordId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            log.status === 'success' ? 'success' : 'danger'
                          }
                        >
                          {log.status === 'success' ? '✓' : '✗'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredLogs.length > 50 && (
            <div className="px-4 py-3 text-center text-sm text-gray-600 border-t bg-gray-50">
              Showing 50 of {filteredLogs.length} entries
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
