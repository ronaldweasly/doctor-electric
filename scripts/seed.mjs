import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MUST use service role key to insert without RLS blocking us
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Arjun', 'Sai', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Kiara', 'Avni', 'Isha', 'Riya', 'Kavya', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Amit'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Mehta', 'Joshi', 'Chauhan', 'Yadav', 'Rajput', 'Reddy', 'Nair', 'Menon'];
const CITIES = ['Mumbai, MH', 'Delhi, DL', 'Bangalore, KA', 'Hyderabad, TS', 'Ahmedabad, GJ', 'Chennai, TN', 'Kolkata, WB', 'Surat, GJ', 'Pune, MH', 'Jaipur, RJ'];
const ROOF_TYPES = ['Flat RCC', 'Slanted Tin', 'Slanted Tiled', 'Industrial Shed'];
const STAGES = [
  'Lead', 'Survey Scheduled', 'Survey Done', 'Quotation Sent', 
  'Quotation Approved', 'Installation Started', 'Installation Completed', 
  'Subsidy Applied', 'Subsidy Received', 'Project Closed'
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
  return '+91 ' + Math.floor(9000000000 + Math.random() * 999999999).toString();
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData() {
  console.log('🌱 Starting database seed with 50 dummy clients...');

  const clients = [];
  const workflow_status = [];
  const surveys = [];
  const quotations = [];
  const installations = [];
  const subsidies = [];
  const payments = [];

  const adminEmail = 'admin@solar.com';

  for (let i = 0; i < 50; i++) {
    // Generate unique 8-char ID matching the app's UUID slicing
    const clientId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const name = `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
    const systemSize = (Math.random() * 8 + 2).toFixed(1); // 2kW to 10kW
    const createdDate = randomDate(new Date(2023, 0, 1), new Date());
    
    // Choose a random stage to simulate an active pipeline
    const stageIndex = Math.floor(Math.random() * STAGES.length);
    const stage = STAGES[stageIndex];
    
    clients.push({
      id: clientId,
      name: name,
      phone: randomPhone(),
      address: `${Math.floor(Math.random() * 900) + 100}, Sector ${Math.floor(Math.random() * 20) + 1}, ${randomElement(CITIES)}`,
      roof_type: randomElement(ROOF_TYPES),
      system_size_kw: Number(systemSize),
      created_date: createdDate.toISOString(),
      assigned_to: adminEmail
    });

    workflow_status.push({
      client_id: clientId,
      stage: stage,
      updated_at: new Date(createdDate.getTime() + 86400000).toISOString(),
      updated_by: adminEmail
    });

    // If past survey scheduled
    if (stageIndex >= 2) {
      surveys.push({
        client_id: clientId,
        survey_date: new Date(createdDate.getTime() + 172800000).toISOString().split('T')[0],
        surveyor_name: 'Engineer Rao',
        recommended_system_details: `${systemSize}kW Mono PERC with 5kW Inverter`
      });
    }

    // If past quotation
    const amount = Math.floor(systemSize * 60000); // roughly ₹60,000 per kW
    if (stageIndex >= 3) {
      quotations.push({
        client_id: clientId,
        amount: amount,
        validity_date: new Date(createdDate.getTime() + 2592000000).toISOString().split('T')[0],
        approval_status: stageIndex >= 4 ? 'Approved' : 'Pending'
      });
    }

    // If past installation started
    if (stageIndex >= 5) {
      installations.push({
        client_id: clientId,
        team_members: 'Alpha Team',
        progress_notes: stageIndex >= 6 ? 'Completed successfully' : 'Wiring in progress',
        completion_percentage: stageIndex >= 6 ? 100 : Math.floor(Math.random() * 80 + 10),
        start_date: new Date(createdDate.getTime() + 864000000).toISOString().split('T')[0],
        end_date: stageIndex >= 6 ? new Date(createdDate.getTime() + 1036800000).toISOString().split('T')[0] : null
      });
    }

    // Subsidies
    if (stageIndex >= 7) {
      subsidies.push({
        client_id: clientId,
        status: stageIndex >= 8 ? 'Received' : 'Under Review',
        applied_date: new Date(createdDate.getTime() + 1209600000).toISOString().split('T')[0],
        amount: Math.floor(amount * 0.2) // 20% subsidy roughly
      });
    }

    // Payments
    const paidAmount = stageIndex >= 9 ? amount : stageIndex >= 5 ? Math.floor(amount * 0.5) : 0;
    payments.push({
      client_id: clientId,
      total_amount: amount,
      paid_amount: paidAmount,
      pending_amount: amount - paidAmount,
      due_date: new Date(createdDate.getTime() + 5184000000).toISOString().split('T')[0],
      payment_status: paidAmount === amount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending'
    });
  }

  async function insertOrThrow(table, data) {
    const { error } = await supabase.from(table).insert(data);
    if (error) {
      console.error(`❌ Failed to insert into ${table}: ${error.message}`);
      throw error;
    }
  }

  try {
    console.log('Inserting Clients...');
    await insertOrThrow('clients', clients);
    
    console.log('Inserting Workflow Status...');
    await insertOrThrow('workflow_status', workflow_status);
    
    console.log('Inserting Surveys...');
    await insertOrThrow('surveys', surveys);
    
    console.log('Inserting Quotations...');
    await insertOrThrow('quotations', quotations);
    
    console.log('Inserting Installations...');
    await insertOrThrow('installations', installations);
    
    console.log('Inserting Subsidies...');
    await insertOrThrow('subsidies', subsidies);
    
    console.log('Inserting Payments...');
    await insertOrThrow('payments', payments);

    console.log('✅ Successfully seeded 50 clients and their related pipeline data!');
  } catch (err) {
    console.error('\n🛑 SEEDING FAILED: You are likely using the Anon Key instead of the Service Role Key. Supabase blocked the insert.');
  }
}

seedData().catch(console.error);
