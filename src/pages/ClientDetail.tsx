import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSheetData, findRowsByColumn, appendRowProtected, updateRowProtected } from '../sheets/api';
import { logDataModification } from '../sheets/activity';
import { SHEET_NAMES } from '../sheets/config';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { validateUploadFile, generateUniqueFilename, addUploadRecord, formatFileSize } from '../utils/upload';
import { uploadFileToStorage } from '../sheets/supabase';

const STAGES = [
  'Lead', 'Survey Scheduled', 'Survey Done', 'Quotation Sent', 
  'Quotation Approved', 'Installation Started', 'Installation Completed', 
  'Subsidy Applied', 'Subsidy Received', 'Project Closed'
];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [client, setClient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Tab States
  const [survey, setSurvey] = useState<any>({});
  const [quotation, setQuotation] = useState<any>({});
  const [installation, setInstallation] = useState<any>({});
  const [subsidy, setSubsidy] = useState<any>({});
  const [payment, setPayment] = useState<any>({});
  const [documents, setDocuments] = useState<any>({});

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      const [clientsData, statusesData] = await Promise.all([
        getSheetData(SHEET_NAMES.CLIENTS),
        getSheetData(SHEET_NAMES.WORKFLOW_STATUS)
      ]);
      
      const clientData = clientsData.find(c => c.ID === id);
      if (!clientData) {
        toast.error("Client not found");
        navigate('/clients');
        return;
      }
      setClient(clientData);

      const clientHistory = statusesData.filter(s => s['Client ID'] === id).reverse();
      setHistory(clientHistory);

      // Load other sheet data
      const [surveys, quotes, installs, subsidies, payments, docs] = await Promise.all([
        getSheetData(SHEET_NAMES.SURVEYS),
        getSheetData(SHEET_NAMES.QUOTATIONS),
        getSheetData(SHEET_NAMES.INSTALLATIONS),
        getSheetData(SHEET_NAMES.SUBSIDIES),
        getSheetData(SHEET_NAMES.PAYMENTS),
        getSheetData(SHEET_NAMES.DOCUMENTS),
      ]);

      setSurvey(surveys.find(s => s['Client ID'] === id) || { _isNew: true });
      setQuotation(quotes.find(q => q['Client ID'] === id) || { _isNew: true });
      setInstallation(installs.find(i => i['Client ID'] === id) || { _isNew: true });
      setSubsidy(subsidies.find(s => s['Client ID'] === id) || { _isNew: true });
      setPayment(payments.find(p => p['Client ID'] === id) || { _isNew: true });
      setDocuments(docs.find(d => d['Client ID'] === id) || { _isNew: true });

    } catch (err) {
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, state: any, setState: any, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      toast.error(`Upload failed: ${validation.errors[0]}`);
      return;
    }

    if (!validation.sanitizedFile) {
      toast.error('Failed to sanitize file');
      return;
    }

    const toastId = toast.loading(`Validating and uploading ${file.name}...`);
    try {
      const sanitizedFile = validation.sanitizedFile;
      const uniqueName = generateUniqueFilename(file.name, id, fieldKey);

      // Upload to Supabase Storage
      const publicUrl = await uploadFileToStorage(sanitizedFile, `clients/${id}/${fieldKey}`);

      // Record the upload locally for tracking
      addUploadRecord({
        filename: uniqueName,
        originalFilename: file.name,
        clientId: id || 'unknown',
        documentType: fieldKey,
        fileSize: sanitizedFile.size,
        mimeType: sanitizedFile.type,
        uploadedBy: user?.email || 'unknown',
        uploadedAt: new Date().toISOString(),
        url: publicUrl,
        status: 'completed',
      });

      setState({ ...state, [fieldKey]: publicUrl });
      toast.success(`${file.name} (${formatFileSize(file.size)}) uploaded!`, { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStage = e.target.value;
    try {
      const row = [id, newStage, new Date().toISOString(), user?.email || ''];
      await appendRowProtected(SHEET_NAMES.WORKFLOW_STATUS, row, user?.email, user?.role);
      logDataModification('UPDATE', SHEET_NAMES.WORKFLOW_STATUS, id!, user?.id || '', user?.email || '',
        [{ field: 'Stage', oldValue: currentStage, newValue: newStage }], client?.Name);
      toast.success(`Stage updated to ${newStage}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
    }
  };

  const handleSaveTab = async (sheetName: string, state: any, setState: any, keys: string[]) => {
    try {
      if (!id) return;
      const rowData = [id, ...keys.map(k => state[k] || '')];
      
      if (state._isNew) {
        await appendRowProtected(sheetName, rowData, user?.email, user?.role);
        logDataModification('CREATE', sheetName, id, user?.id || '', user?.email || '', undefined, client?.Name);
        toast.success(`${sheetName} record saved`);
      } else {
        await updateRowProtected(sheetName, state._rowIndex, rowData, user?.email, user?.role);
        logDataModification('UPDATE', sheetName, id, user?.id || '', user?.email || '', undefined, client?.Name);
        toast.success(`${sheetName} updated`);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || `Failed to save ${sheetName}`);
    }
  };

  const currentStage = history[0]?.Stage || 'Lead';
  
  // Role checks
  const isAdmin = user?.role === 'Admin' || !user?.role;
  const isEngineer = user?.role === 'Engineer';
  const isAccountant = user?.role === 'Accountant';
  const isSales = user?.role === 'Sales Team';

  const canEditSurvey = isAdmin || isEngineer;
  const canEditQuotation = isAdmin;
  const canEditInstallation = isAdmin || isEngineer;
  const canEditSubsidy = isAdmin;
  const canEditPayment = isAdmin || isAccountant;

  const tabs = [
    { name: 'Overview', show: true },
    { name: 'Survey', show: true },
    { name: 'Quotation', show: true },
    { name: 'Installation', show: true },
    { name: 'Subsidy', show: true },
    { name: 'Payment', show: true },
    { name: 'Documents', show: true },
  ].filter(t => t.show);

  if (loading) {
    return <div className="p-8"><Skeleton className="h-40 w-full mb-8"/><Skeleton className="h-64 w-full"/></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate(-1)}>&larr; Back</Button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{client?.Name}</h1>
          <Badge variant={currentStage === 'Project Closed' ? 'success' : 'warning'}>{currentStage}</Badge>
        </div>
        
        {(!isEngineer && !isAccountant) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">Update Stage:</span>
            <Select 
              value={currentStage} 
              onChange={handleStageChange}
              options={STAGES.map(s => ({label: s, value: s}))}
              className="w-48"
            />
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto pb-[1px]">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`whitespace-nowrap px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.name
                ? 'border-solar text-solar'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Client Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-gray-500">Client ID</div><div className="font-medium text-gray-900">{client?.ID}</div>
                  <div className="text-gray-500">Phone</div><div className="font-medium text-gray-900">{client?.Phone}</div>
                  <div className="text-gray-500">Address</div><div className="font-medium text-gray-900">{client?.Address}</div>
                  <div className="text-gray-500">System Size</div><div className="font-medium text-gray-900">{client?.['System Size (kW)']} kW ({client?.['Roof Type']})</div>
                  <div className="text-gray-500">Created Date</div><div className="font-medium text-gray-900">{client?.['Created Date']}</div>
                  <div className="text-gray-500">Assigned To</div><div className="font-medium text-gray-900">{client?.['Assigned To'] || 'Unassigned'}</div>
                </div>
              </div>
              
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                 <h3 className="text-lg font-semibold border-b pb-2">Workflow History</h3>
                 <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={i} className="flex border-l-2 border-solar ml-2 pl-4 py-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{h.Stage}</p>
                          <p className="text-xs text-gray-500">{new Date(h['Updated At']).toLocaleString()} by {h['Updated By']}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Survey' && (
            <div className="space-y-4 max-w-2xl">
              <Input label="Survey Date" type="date" value={survey['Survey Date'] || ''} onChange={e => setSurvey({...survey, 'Survey Date': e.target.value})} disabled={!canEditSurvey} />
              <Input label="Surveyor Name" value={survey['Surveyor Name'] || ''} onChange={e => setSurvey({...survey, 'Surveyor Name': e.target.value})} disabled={!canEditSurvey} />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Site Images (Drive Link)</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  {canEditSurvey && <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, survey, setSurvey, 'Site Images')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />}
                  <Input placeholder="Or paste Drive link" value={survey['Site Images'] || ''} onChange={e => setSurvey({...survey, 'Site Images': e.target.value})} disabled={!canEditSurvey} />
                </div>
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommended System Details</label>
                <textarea 
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-solar outline-none min-h-[100px]"
                  value={survey['Recommended System Details'] || ''}
                  onChange={e => setSurvey({...survey, 'Recommended System Details': e.target.value})}
                  disabled={!canEditSurvey}
                />
              </div>
              {canEditSurvey && (
                <Button onClick={() => handleSaveTab(SHEET_NAMES.SURVEYS, survey, setSurvey, ['Survey Date', 'Site Images', 'Recommended System Details', 'Surveyor Name'])}>Save Survey Details</Button>
              )}
            </div>
          )}

          {activeTab === 'Quotation' && (
            <div className="space-y-4 max-w-2xl">
              <Input label="Amount (₹)" type="number" value={quotation['Amount (₹)'] || ''} onChange={e => setQuotation({...quotation, 'Amount (₹)': e.target.value})} disabled={!canEditQuotation} />
              <Input label="Validity Date" type="date" value={quotation['Validity Date'] || ''} onChange={e => setQuotation({...quotation, 'Validity Date': e.target.value})} disabled={!canEditQuotation} />
              <Select label="Approval Status" value={quotation['Approval Status'] || ''} onChange={e => setQuotation({...quotation, 'Approval Status': e.target.value})} options={[{label:'Pending',value:'Pending'},{label:'Approved',value:'Approved'},{label:'Rejected',value:'Rejected'}]} disabled={!canEditQuotation} />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Quotation PDF</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  {canEditQuotation && <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, quotation, setQuotation, 'Quotation PDF')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />}
                  <Input placeholder="Or paste Drive link" value={quotation['Quotation PDF'] || documents['Quotation Doc Link'] || ''} onChange={e => setQuotation({...quotation, 'Quotation PDF': e.target.value})} disabled={!canEditQuotation} />
                </div>
              </div>
              {canEditQuotation && <Button onClick={() => handleSaveTab(SHEET_NAMES.QUOTATIONS, quotation, setQuotation, ['Quotation PDF', 'Amount (₹)', 'Validity Date', 'Approval Status'])}>Save Quotation</Button>}
            </div>
          )}

          {activeTab === 'Installation' && (
            <div className="space-y-4 max-w-2xl">
              <Input label="Start Date" type="date" value={installation['Start Date'] || ''} onChange={e => setInstallation({...installation, 'Start Date': e.target.value})} disabled={!canEditInstallation} />
              <Input label="End Date" type="date" value={installation['End Date'] || ''} onChange={e => setInstallation({...installation, 'End Date': e.target.value})} disabled={!canEditInstallation}  />
              <Input label="Team Members (comma-separated)" value={installation['Team Members'] || ''} onChange={e => setInstallation({...installation, 'Team Members': e.target.value})} disabled={!canEditInstallation} />
              <div className="w-full">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Completion % : {installation['Completion %'] || 0}%</label>
                 <input type="range" min="0" max="100" value={installation['Completion %'] || 0} onChange={e => setInstallation({...installation, 'Completion %': e.target.value})} className="w-full" disabled={!canEditInstallation} />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress Notes</label>
                <textarea 
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-solar outline-none min-h-[100px]"
                  value={installation['Progress Notes'] || ''}
                  onChange={e => setInstallation({...installation, 'Progress Notes': e.target.value})}
                  disabled={!canEditInstallation}
                />
              </div>
              {canEditInstallation && (
                <Button onClick={() => handleSaveTab(SHEET_NAMES.INSTALLATIONS, installation, setInstallation, ['Team Members', 'Progress Notes', 'Completion %', 'Start Date', 'End Date'])}>Save Installation Details</Button>
              )}
            </div>
          )}

          {activeTab === 'Subsidy' && (
            <div className="space-y-4 max-w-2xl">
              <Select 
                label="Status" 
                value={subsidy['Status'] || ''} 
                onChange={e => setSubsidy({...subsidy, 'Status': e.target.value})}
                options={[
                  {label:'Select...', value:''},
                  {label:'Applied', value:'Applied'},
                  {label:'Under Review', value:'Under Review'},
                  {label:'Approved', value:'Approved'},
                  {label:'Received', value:'Received'}
                ]}
                disabled={!canEditSubsidy}
              />
              <Input label="Applied Date" type="date" value={subsidy['Applied Date'] || ''} onChange={e => setSubsidy({...subsidy, 'Applied Date': e.target.value})} disabled={!canEditSubsidy} />
              <Input label="Approval Date" type="date" value={subsidy['Approval Date'] || ''} onChange={e => setSubsidy({...subsidy, 'Approval Date': e.target.value})} disabled={!canEditSubsidy} />
              <Input label="Amount (₹)" type="number" value={subsidy['Amount (₹)'] || ''} onChange={e => setSubsidy({...subsidy, 'Amount (₹)': e.target.value})} disabled={!canEditSubsidy} />
              {canEditSubsidy && (
                <Button onClick={() => handleSaveTab(SHEET_NAMES.SUBSIDIES, subsidy, setSubsidy, ['Status', 'Applied Date', 'Approval Date', 'Amount (₹)'])}>Save Subsidy Details</Button>
              )}
            </div>
          )}

          {activeTab === 'Payment' && (
            <div className="space-y-4 max-w-2xl">
              <Input label="Total Amount (₹)" type="number" value={payment['Total Amount (₹)'] || ''} onChange={e => setPayment({...payment, 'Total Amount (₹)': e.target.value})} disabled={!canEditPayment} />
              <Input label="Paid Amount (₹)" type="number" value={payment['Paid Amount (₹)'] || ''} onChange={e => setPayment({...payment, 'Paid Amount (₹)': e.target.value})} disabled={!canEditPayment} />
              <Input label="Pending Amount (₹)" type="number" value={payment['Pending Amount (₹)'] || ''} onChange={e => setPayment({...payment, 'Pending Amount (₹)': e.target.value})} disabled={!canEditPayment} />
              <Input label="Due Date" type="date" value={payment['Due Date'] || ''} onChange={e => setPayment({...payment, 'Due Date': e.target.value})} disabled={!canEditPayment} />
              <Select 
                label="Payment Status" 
                value={payment['Payment Status'] || ''} 
                onChange={e => setPayment({...payment, 'Payment Status': e.target.value})}
                options={[
                  {label:'Select...', value:''},
                  {label:'Pending', value:'Pending'},
                  {label:'Partial', value:'Partial'},
                  {label:'Paid', value:'Paid'},
                  {label:'Overdue', value:'Overdue'}
                ]}
                disabled={!canEditPayment}
              />
              {canEditPayment && (
                <Button onClick={() => handleSaveTab(SHEET_NAMES.PAYMENTS, payment, setPayment, ['Total Amount (₹)', 'Paid Amount (₹)', 'Pending Amount (₹)', 'Due Date', 'Payment Status'])}>Save Payment Details</Button>
              )}
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-gray-500 mb-4">Upload files directly to Google Drive or provide links manually.</p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Aadhaar Document</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="file" onChange={(e) => handleFileUpload(e, documents, setDocuments, 'Aadhaar Link')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                  <Input value={documents['Aadhaar Link'] || ''} onChange={e => setDocuments({...documents, 'Aadhaar Link': e.target.value})} placeholder="Drive Link" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Electricity Bill</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="file" onChange={(e) => handleFileUpload(e, documents, setDocuments, 'Electricity Bill Link')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                  <Input value={documents['Electricity Bill Link'] || ''} onChange={e => setDocuments({...documents, 'Electricity Bill Link': e.target.value})} placeholder="Drive Link" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quotation Doc</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="file" onChange={(e) => handleFileUpload(e, documents, setDocuments, 'Quotation Doc Link')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                  <Input value={documents['Quotation Doc Link'] || ''} onChange={e => setDocuments({...documents, 'Quotation Doc Link': e.target.value})} placeholder="Drive Link" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Installation Photos</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="file" multiple onChange={(e) => handleFileUpload(e, documents, setDocuments, 'Installation Photos Link')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                  <Input value={documents['Installation Photos Link'] || ''} onChange={e => setDocuments({...documents, 'Installation Photos Link': e.target.value})} placeholder="Drive Link" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Subsidy Docs</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="file" multiple onChange={(e) => handleFileUpload(e, documents, setDocuments, 'Subsidy Docs Link')} className="text-sm border border-slate-300 p-1.5 rounded-md w-full sm:w-auto" />
                  <Input value={documents['Subsidy Docs Link'] || ''} onChange={e => setDocuments({...documents, 'Subsidy Docs Link': e.target.value})} placeholder="Drive Link" />
                </div>
              </div>

              <Button onClick={() => handleSaveTab(SHEET_NAMES.DOCUMENTS, documents, setDocuments, ['Aadhaar Link', 'Electricity Bill Link', 'Quotation Doc Link', 'Installation Photos Link', 'Subsidy Docs Link'])} className="mt-4">Save Document Links</Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
