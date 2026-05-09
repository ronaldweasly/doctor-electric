import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSheetData, appendRow } from '../sheets/api';
import { SHEET_NAMES } from '../sheets/config';
import { ClientRow, WorkflowStatusRow, UserRow } from '../sheets/types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SlideOver } from '../ui/SlideOver';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { uploadFileToStorage } from '../sheets/supabase';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [salesUsers, setSalesUsers] = useState<{label: string, value: string}[]>([]);
  const [search, setSearch] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
       // Upload to Supabase Storage
       const publicUrl = await uploadFileToStorage(file, 'client_uploads');
       setValue(fieldName, publicUrl);
       toast.success(`${file.name} uploaded successfully!`, { id: toastId });
    } catch (error: any) {
       console.error("Upload Error:", error);
       toast.error(`Upload failed: ${error.message}`, { id: toastId });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [allClients, workflow, allUsers] = await Promise.all([
        getSheetData<ClientRow>(SHEET_NAMES.CLIENTS),
        getSheetData<WorkflowStatusRow>(SHEET_NAMES.WORKFLOW_STATUS),
        getSheetData<UserRow>(SHEET_NAMES.USERS)
      ]);

      const workflowMap = new Map();
      workflow.forEach(w => {
         // keep the latest entry. Assuming sheets are appended over time, the last one is latest.
         workflowMap.set(w['Client ID'], w.Stage);
      });

      const merged = allClients.map(c => ({
        ...c,
        Stage: workflowMap.get(c.ID) || 'Lead'
      }));

      setClients(merged.reverse()); // Show newest first

      const assignees = allUsers
        .filter(u => u.Active === 'TRUE' && (u.Role === 'Sales Team' || u.Role === 'Admin'))
        .map(u => ({ label: u.Name || u.Email, value: u.Email }));
      
      setSalesUsers(assignees);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const clientId = uuidv4().slice(0, 8).toUpperCase();
      const createdDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

      const clientRow = [
        clientId,
        data.Name,
        data.Phone,
        data.Address,
        data.RoofType,
        data.SystemSize,
        createdDate,
        data.AssignedTo || user?.email || ''
      ];

      const workflowRow = [
        clientId,
        'Lead',
        new Date().toISOString(),
        user?.email || ''
      ];

      await appendRow(SHEET_NAMES.CLIENTS, clientRow);
      await appendRow(SHEET_NAMES.WORKFLOW_STATUS, workflowRow);

      // Handle optional sections if filled
      if (data.SurveyDate || data.SurveyorName || data.SiteImages || data.RecommendedDetails) {
         await appendRow(SHEET_NAMES.SURVEYS, [clientId, data.SurveyDate || '', data.SiteImages || '', data.RecommendedDetails || '', data.SurveyorName || '']);
      }
      if (data.QuotationPDF || data.QuotationAmount || data.QuotationValidity || data.QuotationStatus) {
         await appendRow(SHEET_NAMES.QUOTATIONS, [clientId, data.QuotationPDF || '', data.QuotationAmount || '', data.QuotationValidity || '', data.QuotationStatus || '']);
      }
      if (data.InstallStart || data.InstallEnd || data.InstallTeam) {
         await appendRow(SHEET_NAMES.INSTALLATIONS, [clientId, data.InstallTeam || '', '', '', data.InstallStart || '', data.InstallEnd || '']);
      }
      if (data.SubsidyStatus || data.SubsidyApplied || data.SubsidyApproval || data.SubsidyAmount) {
         await appendRow(SHEET_NAMES.SUBSIDIES, [clientId, data.SubsidyStatus || '', data.SubsidyApplied || '', data.SubsidyApproval || '', data.SubsidyAmount || '']);
      }
      if (data.PaymentTotal || data.PaymentPaid || data.PaymentPending || data.PaymentDue || data.PaymentStatus) {
         await appendRow(SHEET_NAMES.PAYMENTS, [clientId, data.PaymentTotal || '', data.PaymentPaid || '', data.PaymentPending || '', data.PaymentDue || '', data.PaymentStatus || '']);
      }
      if (data.AadhaarLink || data.ElectricityBillLink) {
         await appendRow(SHEET_NAMES.DOCUMENTS, [clientId, data.AadhaarLink || '', data.ElectricityBillLink || '', '', '', '']);
      }

      toast.success('Client profile created completely!');
      setIsSlideOpen(false);
      reset();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
    }
  };

  const filteredClients = clients.filter(c => 
    c.Name.toLowerCase().includes(search.toLowerCase()) || 
    c.Phone.includes(search) ||
    c.Stage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Sticky header on mobile */}
      <div className="sticky top-0 z-10 bg-slate-50 -mx-3 px-3 sm:-mx-4 sm:px-4 md:static md:mx-0 md:px-0 md:bg-transparent pb-2 sm:pb-0">
        <h1 className="text-xl font-bold text-slate-900 mb-3 hidden sm:block">Clients Pipeline</h1>
        <div className="flex gap-2 items-center">
          <input
            type="search"
            placeholder="🔍 Search clients, phone, stage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white
                       text-sm placeholder-slate-400 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
          />
          <Button onClick={() => setIsSlideOpen(true)} className="whitespace-nowrap shrink-0 h-10 sm:h-auto">
            <span className="hidden sm:inline">+ Add Client</span>
            <span className="sm:hidden text-lg leading-none">+</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile: Card view */}
          <div className="md:hidden space-y-2 p-3">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-2">🔍</p>
                <p className="font-semibold">No clients found</p>
              </div>
            ) : (
              filteredClients.map((client, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl p-4 bg-white active:bg-blue-50
                             cursor-pointer transition-colors touch-manipulation"
                  onClick={() => navigate(`/clients/${client.ID}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{client.Name}</p>
                      <p className="text-xs text-slate-500 font-mono">{client.ID}</p>
                    </div>
                    <Badge variant={
                      client.Stage === 'Project Closed' ? 'success' : 
                      client.Stage.includes('Installation') ? 'warning' : 'default'
                    }>
                      {client.Stage}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-600"><span className="font-medium">Phone:</span> {client.Phone}</p>
                    <p className="text-slate-600"><span className="font-medium">System:</span> {client['System Size (kW)']}kW</p>
                    <p className="text-slate-500 truncate"><span className="font-medium">Address:</span> {client.Address}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 md:px-6 py-3">Client ID</th>
                  <th className="px-4 md:px-6 py-3">Name</th>
                  <th className="px-4 md:px-6 py-3">Contact</th>
                  <th className="px-4 md:px-6 py-3">System</th>
                  <th className="px-4 md:px-6 py-3">Stage</th>
                  <th className="px-4 md:px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white text-xs">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 md:px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-4 md:px-6 py-4 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 md:px-6 py-12 text-center text-slate-500">
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, i) => (
                    <tr 
                      key={i} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50"
                      onClick={() => navigate(`/clients/${client.ID}`)}
                    >
                      <td className="px-4 md:px-6 py-4 font-mono text-[10px] text-slate-500">{client.ID}</td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-slate-800">{client.Name}</td>
                      <td className="px-4 md:px-6 py-4 text-slate-600">
                        <div className="font-medium">{client.Phone}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{client.Address}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-slate-600">
                        {client['System Size (kW)']}kW
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant={
                          client.Stage === 'Project Closed' ? 'success' : 
                          client.Stage.includes('Installation') ? 'warning' : 'default'}
                        >
                          {client.Stage}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right font-medium text-blue-700">
                        Details
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SlideOver isOpen={isSlideOpen} onClose={() => setIsSlideOpen(false)} title="Add New Client">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2 pb-8">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">1. Client Info</h3>
            <Input 
              label="Name *" 
              {...register('Name', { required: 'Name is required' })} 
              error={errors.Name?.message as string}
            />
            <Input 
              label="Phone Number *" 
              {...register('Phone', { required: 'Phone Number is required' })} 
              error={errors.Phone?.message as string}
            />
            <Input 
              label="Address *" 
              {...register('Address', { required: 'Address is required' })} 
              error={errors.Address?.message as string}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Roof Type *" 
                {...register('RoofType', { required: 'Roof Type is required' })} 
                options={[
                  {label: 'Select...', value: ''},
                  {label: 'Flat', value: 'Flat'},
                  {label: 'Sloped', value: 'Sloped'},
                  {label: 'Mixed', value: 'Mixed'}
                ]}
                error={errors.RoofType?.message as string}
              />
              <Select 
                label="System Size (kW) *" 
                {...register('SystemSize', { required: 'System size is required' })} 
                options={[
                  {label: 'Select...', value: ''},
                  {label: '3 kW', value: '3'},
                  {label: '5 kW', value: '5'},
                  {label: '8 kW', value: '8'},
                  {label: '10 kW', value: '10'},
                  {label: '15 kW', value: '15'},
                  {label: '20 kW', value: '20'}
                ]}
                error={errors.SystemSize?.message as string}
              />
            </div>
            <Select 
              label="Assign To" 
              {...register('AssignedTo')} 
              options={[{label: 'Unassigned', value: ''}, ...salesUsers]}
            />
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">2. Initial Documents</h3>
            <p className="text-xs text-slate-500">Upload documents to generate Google Drive links.</p>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Aadhaar Photo / PDF</label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'AadhaarLink')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                <Input placeholder="Or paste Drive link" {...register('AadhaarLink')} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Electricity Bill</label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'ElectricityBillLink')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                <Input placeholder="Or paste Drive link" {...register('ElectricityBillLink')} />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">3. Survey Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Survey Date" type="date" {...register('SurveyDate')} />
              <Input label="Surveyor Name" {...register('SurveyorName')} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Site Images</label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, 'SiteImages')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                <Input placeholder="Or paste Drive link" {...register('SiteImages')} />
              </div>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommended System Details</label>
              <textarea 
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-700 outline-none min-h-[80px]"
                {...register('RecommendedDetails')}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">4. Quotation (Optional)</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Quotation PDF</label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'QuotationPDF')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                <Input placeholder="Or paste Drive link" {...register('QuotationPDF')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount (₹)" type="number" {...register('QuotationAmount')} />
              <Input label="Validity Date" type="date" {...register('QuotationValidity')} />
            </div>
            <Select 
              label="Approval Status" 
              {...register('QuotationStatus')} 
              options={[{label:'Pending',value:'Pending'},{label:'Approved',value:'Approved'},{label:'Rejected',value:'Rejected'}]}
            />
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">5. Installation & Subsidy (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Installation Start" type="date" {...register('InstallStart')} />
              <Select 
                label="Subsidy Status" 
                {...register('SubsidyStatus')} 
                options={[
                  {label:'Select...', value:''},
                  {label:'Applied', value:'Applied'},
                  {label:'Under Review', value:'Under Review'},
                  {label:'Approved', value:'Approved'},
                  {label:'Received', value:'Received'}
                ]}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider border-b pb-2">6. Payment Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
               <Input label="Total Amount (₹)" type="number" {...register('PaymentTotal')} />
               <Input label="Paid Amount (₹)" type="number" {...register('PaymentPaid')} />
               <Input label="Pending Amount (₹)" type="number" {...register('PaymentPending')} />
               <Input label="Due Date" type="date" {...register('PaymentDue')} />
            </div>
            <Select 
              label="Payment Status" 
              {...register('PaymentStatus')} 
              options={[
                {label:'Select...', value:''},
                {label:'Pending',value:'Pending'},
                {label:'Partial',value:'Partial'},
                {label:'Paid',value:'Paid'},
                {label:'Overdue',value:'Overdue'}
              ]}
            />
          </div>

          <div className="pt-8 mb-8">
            <Button type="submit" disabled={isSubmitting} className="w-full text-base py-3">
              {isSubmitting ? 'Saving...' : 'Save Complete Client Profile'}
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
