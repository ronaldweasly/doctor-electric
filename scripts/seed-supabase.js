#!/usr/bin/env node
/**
 * Seed Supabase with mock data
 * Usage: node scripts/seed-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Load .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Mock data ────────────────────────────────────────────────────────────
const mockUsers = [
  { email: 'hfj1887@gmail.com', role: 'Admin', name: 'Himanshu Shukla', active: true },
  { email: 'admin@solar.com', role: 'Admin', name: 'John Doe', active: true },
  { email: 'sales@solar.com', role: 'Sales Team', name: 'Alice Sales', active: true },
  { email: 'engineer@solar.com', role: 'Engineer', name: 'Bob Builder', active: true },
  { email: 'accountant@solar.com', role: 'Accountant', name: 'Cathy Coin', active: true },
];

const mockClients = [
  {
    id: 'C001',
    name: 'Rajesh Kumar',
    phone: '9876543210',
    address: '123, MG Road, Bangalore',
    roof_type: 'Flat',
    system_size_kw: 5,
    created_date: '2025-11-15',
    assigned_to: 'sales@solar.com',
  },
  {
    id: 'C002',
    name: 'Priya Sharma',
    phone: '9765432109',
    address: '456, Link Road, Mumbai',
    roof_type: 'Sloped',
    system_size_kw: 8,
    created_date: '2025-12-01',
    assigned_to: 'admin@solar.com',
  },
  {
    id: 'C003',
    name: 'Amit Patel',
    phone: '9654321098',
    address: '789, Park Street, Kolkata',
    roof_type: 'Mixed',
    system_size_kw: 10,
    created_date: '2025-12-15',
    assigned_to: 'sales@solar.com',
  },
];

const mockWorkflow = [
  { client_id: 'C001', stage: 'Lead', updated_at: '2025-11-15T00:00:00Z', updated_by: 'admin@solar.com' },
  { client_id: 'C001', stage: 'Survey Scheduled', updated_at: '2025-11-17T00:00:00Z', updated_by: 'sales@solar.com' },
  { client_id: 'C001', stage: 'Survey Done', updated_at: '2025-11-20T00:00:00Z', updated_by: 'engineer@solar.com' },
  { client_id: 'C002', stage: 'Lead', updated_at: '2025-12-01T00:00:00Z', updated_by: 'admin@solar.com' },
  { client_id: 'C002', stage: 'Survey Scheduled', updated_at: '2025-12-03T00:00:00Z', updated_by: 'sales@solar.com' },
  { client_id: 'C003', stage: 'Lead', updated_at: '2025-12-15T00:00:00Z', updated_by: 'admin@solar.com' },
];

const mockSurveys = [
  {
    client_id: 'C001',
    survey_date: '2025-11-17',
    site_images: 'https://example.com/survey-c001.jpg',
    recommended_system_details: '5kW system with premium panels',
    surveyor_name: 'Bob Builder',
  },
  {
    client_id: 'C002',
    survey_date: '2025-12-03',
    site_images: 'https://example.com/survey-c002.jpg',
    recommended_system_details: '8kW system with battery backup',
    surveyor_name: 'Bob Builder',
  },
];

const mockQuotations = [
  {
    client_id: 'C001',
    quotation_pdf: 'https://example.com/quotation-c001.pdf',
    amount: 250000,
    validity_date: '2025-12-15',
    approval_status: 'Pending',
  },
  {
    client_id: 'C002',
    quotation_pdf: 'https://example.com/quotation-c002.pdf',
    amount: 400000,
    validity_date: '2026-01-03',
    approval_status: 'Approved',
  },
];

const mockPayments = [
  {
    client_id: 'C001',
    total_amount: 250000,
    paid_amount: 75000,
    pending_amount: 175000,
    due_date: '2025-12-31',
    payment_status: 'Partial',
  },
  {
    client_id: 'C002',
    total_amount: 400000,
    paid_amount: 0,
    pending_amount: 400000,
    due_date: '2026-01-15',
    payment_status: 'Pending',
  },
  {
    client_id: 'C003',
    total_amount: 500000,
    paid_amount: 0,
    pending_amount: 500000,
    due_date: '2026-02-01',
    payment_status: 'Pending',
  },
];

// ─── Seed function ────────────────────────────────────────────────────────
async function seedDatabase() {
  try {
    console.log('🌱 Starting Supabase seeding...\n');

    // Clear existing data (optional - commented out for safety)
    // await supabase.from('payments').delete().neq('client_id', '');
    // await supabase.from('documents').delete().neq('client_id', '');
    // await supabase.from('subsidies').delete().neq('client_id', '');
    // await supabase.from('installations').delete().neq('client_id', '');
    // await supabase.from('quotations').delete().neq('client_id', '');
    // await supabase.from('surveys').delete().neq('client_id', '');
    // await supabase.from('workflow_status').delete().neq('client_id', '');
    // await supabase.from('clients').delete().neq('id', '');
    // await supabase.from('users').delete().neq('email', '');

    // 1. Seed Users
    console.log('📝 Seeding users...');
    const { error: userError } = await supabase
      .from('users')
      .upsert(mockUsers, { onConflict: 'email' });
    if (userError) throw userError;
    console.log(`✅ Seeded ${mockUsers.length} users\n`);

    // 2. Seed Clients
    console.log('📝 Seeding clients...');
    const { error: clientError } = await supabase
      .from('clients')
      .upsert(mockClients, { onConflict: 'id' });
    if (clientError) throw clientError;
    console.log(`✅ Seeded ${mockClients.length} clients\n`);

    // 3. Seed Workflow Status
    console.log('📝 Seeding workflow status...');
    const { error: workflowError } = await supabase
      .from('workflow_status')
      .insert(mockWorkflow);
    if (workflowError) throw workflowError;
    console.log(`✅ Seeded ${mockWorkflow.length} workflow records\n`);

    // 4. Seed Surveys
    console.log('📝 Seeding surveys...');
    const { error: surveyError } = await supabase
      .from('surveys')
      .insert(mockSurveys);
    if (surveyError) throw surveyError;
    console.log(`✅ Seeded ${mockSurveys.length} surveys\n`);

    // 5. Seed Quotations
    console.log('📝 Seeding quotations...');
    const { error: quotationError } = await supabase
      .from('quotations')
      .insert(mockQuotations);
    if (quotationError) throw quotationError;
    console.log(`✅ Seeded ${mockQuotations.length} quotations\n`);

    // 6. Seed Payments
    console.log('📝 Seeding payments...');
    const { error: paymentError } = await supabase
      .from('payments')
      .insert(mockPayments);
    if (paymentError) throw paymentError;
    console.log(`✅ Seeded ${mockPayments.length} payments\n`);

    console.log('✨ Database seeding complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Verify data at: https://supabase.co/projects');
    console.log('   2. Update .env: VITE_USE_MOCK="false"');
    console.log('   3. Restart dev server: npm run dev');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
