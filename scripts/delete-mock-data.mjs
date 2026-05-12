#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllMockData() {
  console.log('🗑️  Deleting all mock data from Supabase...\n');

  try {
    // First, fetch all clients to show what we're deleting
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, name')
      .order('id');

    if (fetchError) {
      console.error('❌ Error fetching clients:', fetchError.message);
      process.exit(1);
    }

    if (!clients || clients.length === 0) {
      console.log('✓ No clients found in database. Nothing to delete.');
      process.exit(0);
    }

    console.log(`Found ${clients.length} clients to delete:`);
    clients.slice(0, 5).forEach(c => console.log(`  • ${c.id} - ${c.name}`));
    if (clients.length > 5) {
      console.log(`  ... and ${clients.length - 5} more`);
    }

    console.log('\n⏳ Deleting all clients...');

    // Delete all clients (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .neq('id', null);

    if (deleteError) {
      console.error('❌ Error deleting clients:', deleteError.message);
      process.exit(1);
    }

    // Verify deletion
    const { data: remaining, error: verifyError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
      process.exit(1);
    }

    if (!remaining || remaining.length === 0) {
      console.log(`\n✅ Successfully deleted all ${clients.length} client records!`);
      console.log('✅ Database is now clean.');
    } else {
      console.log('⚠️  Warning: Some records may still exist');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

deleteAllMockData();
