import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Upload, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { v4 as uuidv4 } from 'uuid';
import { appendRow } from '../sheets/api';
import { SHEET_NAMES } from '../sheets/config';
import { uploadFileToStorage } from '../sheets/supabase';

interface MultiStepClientFormProps {
  salesUsers: { label: string; value: string }[];
  user?: { email?: string };
  onSuccess?: () => void;
}

export function MultiStepClientForm({ salesUsers, user, onSuccess }: MultiStepClientFormProps) {
  const [step, setStep] = useState(0);
  const [fileUploadStatus, setFileUploadStatus] = useState<{ [key: string]: boolean }>({});
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    mode: 'onChange',
    defaultValues: {
      Name: '',
      Phone: '',
      Address: '',
      RoofType: '',
      SystemSize: '',
      AssignedTo: '',
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileUploadStatus(prev => ({ ...prev, [fieldName]: true }));
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const publicUrl = await uploadFileToStorage(file, 'client_uploads');
      setValue(fieldName, publicUrl);
      toast.success(`Uploaded!`, { id: toastId });
    } catch (error: any) {
      toast.error(`Upload failed`, { id: toastId });
    } finally {
      setFileUploadStatus(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const clientId = uuidv4().slice(0, 8).toUpperCase();
      const createdDate = new Date().toLocaleDateString('en-GB');

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
      if (data.AadhaarLink || data.ElectricityBillLink || data.AadhaarNumber || data.BillNumber) {
        await appendRow(SHEET_NAMES.DOCUMENTS, [clientId, data.AadhaarLink || data.AadhaarNumber || '', data.ElectricityBillLink || data.BillNumber || '', '', '', '']);
      }

      toast.success('✓ Client created successfully!');
      reset();
      setStep(0);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
    }
  };

  const steps = [
    {
      title: 'Client Info',
      description: 'Basic details',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-4">Step 1 of 4 - Required Information</p>
          </div>
          <Input 
            label="Full Name *" 
            placeholder="John Doe"
            {...register('Name', { required: 'Name is required' })} 
            error={errors.Name?.message as string}
          />
          <Input 
            label="Phone Number *" 
            placeholder="98765 43210"
            type="tel"
            {...register('Phone', { required: 'Phone is required' })} 
            error={errors.Phone?.message as string}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
            <textarea
              placeholder="Enter complete address"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
              {...register('Address', { required: 'Address is required' })}
            />
            {errors.Address && <p className="mt-2 text-sm text-red-500">{errors.Address.message as string}</p>}
          </div>
          <Select 
            label="Roof Type *" 
            {...register('RoofType', { required: 'Roof Type is required' })} 
            options={[
              {label: 'Select roof type...', value: ''},
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
              {label: 'Select system size...', value: ''},
              {label: '3 kW', value: '3'},
              {label: '5 kW', value: '5'},
              {label: '8 kW', value: '8'},
              {label: '10 kW', value: '10'},
              {label: '15 kW', value: '15'},
              {label: '20 kW', value: '20'}
            ]}
            error={errors.SystemSize?.message as string}
          />
          <Select 
            label="Assign To" 
            {...register('AssignedTo')} 
            options={[{label: 'Unassigned', value: ''}, ...salesUsers]}
          />
        </div>
      )
    },
    {
      title: 'Documents',
      description: 'Upload or enter details',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-4">Step 2 of 4 - Required Documents</p>
          </div>
          
          {/* Aadhaar Section */}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Aadhaar</label>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Upload Photo/PDF</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, 'AadhaarLink')} 
                    className="block w-full text-sm text-slate-500 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    disabled={fileUploadStatus['AadhaarLink']}
                  />
                  {fileUploadStatus['AadhaarLink'] && (
                    <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex-1 border-t"></div>
                <span>OR</span>
                <div className="flex-1 border-t"></div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Aadhaar Number</label>
                <Input 
                  placeholder="XXXX XXXX XXXX" 
                  {...register('AadhaarNumber')} 
                  maxLength={12}
                />
              </div>
            </div>
          </div>

          {/* Electricity Bill Section */}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Electricity Bill</label>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Upload Photo/PDF</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, 'ElectricityBillLink')} 
                    className="block w-full text-sm text-slate-500 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    disabled={fileUploadStatus['ElectricityBillLink']}
                  />
                  {fileUploadStatus['ElectricityBillLink'] && (
                    <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex-1 border-t"></div>
                <span>OR</span>
                <div className="flex-1 border-t"></div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Bill Number</label>
                <Input 
                  placeholder="Electricity bill number" 
                  {...register('BillNumber')} 
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Survey Details',
      description: 'Optional information',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-4">Step 3 of 4 - Optional</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">You can skip this step and add details later</p>
          </div>
          <Input label="Survey Date" type="date" {...register('SurveyDate')} />
          <Input label="Surveyor Name" placeholder="Name of surveyor" {...register('SurveyorName')} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site Images</label>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, 'SiteImages')} 
              className="block w-full text-sm text-slate-500 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Recommended System Details</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 p-3 text-base focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
              placeholder="Describe the recommended system..."
              {...register('RecommendedDetails')}
            />
          </div>
        </div>
      )
    },
    {
      title: 'Quotation & Subsidy',
      description: 'Optional details',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-4">Step 4 of 4 - Optional</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Quotation PDF</label>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => handleFileUpload(e, 'QuotationPDF')} 
              className="block w-full text-sm text-slate-500 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quotation Amount (₹)" type="number" placeholder="0" {...register('QuotationAmount')} />
            <Input label="Valid Until" type="date" {...register('QuotationValidity')} />
          </div>
          <Select 
            label="Quotation Status" 
            {...register('QuotationStatus')} 
            options={[
              {label:'Select...', value:''},
              {label:'Pending', value:'Pending'},
              {label:'Approved', value:'Approved'},
              {label:'Rejected', value:'Rejected'}
            ]}
          />
          <Input label="Installation Start Date" type="date" {...register('InstallStart')} />
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
      )
    }
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
      {/* Progress indicator */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-slate-900">{steps[step].title}</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {step + 1}/{steps.length}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {steps[step].content}
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-slate-100 px-4 py-4 bg-white flex gap-3 sticky bottom-0">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        {step === steps.length - 1 ? (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? '⏳ Saving...' : '✓ Create Client'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            className="flex-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
