import React, { useState, useEffect } from 'react';
import { getSheetData, appendRow, updateRow } from '../sheets/api';
import { SHEET_NAMES, COLUMNS } from '../sheets/config';
import { UserRow } from '../sheets/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Modal } from '../ui/Modal';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import BackupManager from './BackupManager';
import ActivityViewer from '../components/ActivityViewer';

interface UserFormData {
  Email: string;
  Name: string;
  Role: string;
  Active: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { user } = useAuth();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UserFormData>();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getSheetData(SHEET_NAMES.USERS);
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onSubmit = async (data: UserFormData) => {
    try {
      const rowData = [data.Email, data.Role, data.Name, data.Active];
      
      if (editingUser !== null) {
        // Update
        await updateRow(SHEET_NAMES.USERS, editingUser._rowIndex, rowData);
        toast.success('User updated successfully');
      } else {
        // Create
        await appendRow(SHEET_NAMES.USERS, rowData);
        toast.success('User added successfully');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save user');
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setValue('Email', user.Email);
    setValue('Name', user.Name);
    setValue('Role', user.Role);
    setValue('Active', user.Active);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    reset({ Active: 'TRUE', Role: 'Sales Team' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">System Users</h1>
        <Button onClick={openAdd} className="w-full sm:w-auto">+ Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3 p-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users found</div>
            ) : (
              users.map((user, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{user.Name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.Email}</p>
                    </div>
                    <button onClick={() => openEdit(user)} className="text-blue-700 hover:text-blue-800 font-medium text-xs whitespace-nowrap">
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info" className="text-xs">{user.Role}</Badge>
                    <Badge variant={user.Active === 'TRUE' ? 'success' : 'danger'} className="text-xs">
                      {user.Active === 'TRUE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-4">Name</th>
                  <th className="px-4 md:px-6 py-4">Email</th>
                  <th className="px-4 md:px-6 py-4">Role</th>
                  <th className="px-4 md:px-6 py-4">Status</th>
                  <th className="px-4 md:px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 md:px-6 py-4"></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 md:px-6 py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4 font-medium text-gray-900">{user.Name}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600">{user.Email}</td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant="info">{user.Role}</Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant={user.Active === 'TRUE' ? 'success' : 'danger'}>
                          {user.Active === 'TRUE' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <button onClick={() => openEdit(user)} className="text-blue-700 hover:text-blue-800 font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Edit User" : "Add New User"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Full Name" 
            {...register('Name', { required: 'Name is required' })} 
            error={errors.Name?.message}
          />
          <Input 
            label="Email Address" 
            type="email"
            {...register('Email', { required: 'Email is required' })} 
            error={errors.Email?.message}
            disabled={editingUser !== null} // Usually don't change email
          />
          <Select 
            label="Role" 
            {...register('Role')} 
            options={[
              { label: 'Admin', value: 'Admin' },
              { label: 'Sales Team', value: 'Sales Team' },
              { label: 'Engineer', value: 'Engineer' },
              { label: 'Accountant', value: 'Accountant' },
            ]}
          />
          <Select 
            label="Status" 
            {...register('Active')} 
            options={[
              { label: 'Active', value: 'TRUE' },
              { label: 'Inactive', value: 'FALSE' },
            ]}
          />
          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save User</Button>
          </div>
        </form>
      </Modal>

      {user?.role === 'Admin' && (
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-200 space-y-8 md:space-y-12">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">System Administration</h2>
            <BackupManager />
          </div>

          <div className="pt-6 md:pt-8 border-t border-gray-200">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Activity Audit Trail</h2>
            <ActivityViewer />
          </div>
        </div>
      )}
    </div>
  );
}
