import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key to bypass Row Level Security for backups
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'clients', 'workflow_status', 'surveys', 'quotations', 
  'installations', 'subsidies', 'payments', 'documents', 'users'
];

async function createBackupFolder() {
  const dateStr = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '../backups', dateStr);
  
  const dbDir = path.join(backupDir, 'database');
  const filesDir = path.join(backupDir, 'files');
  
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
  
  return { backupDir, dbDir, filesDir };
}

async function backupDatabase(dbDir) {
  console.log('📊 Starting Database Backup...');
  for (const table of TABLES) {
    console.log(`   Fetching table: ${table}`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`   ❌ Failed to backup ${table}:`, error.message);
      continue;
    }
    
    fs.writeFileSync(
      path.join(dbDir, `${table}.json`), 
      JSON.stringify(data, null, 2)
    );
    console.log(`   ✅ Saved ${data.length} rows from ${table}`);
  }
}

async function listAllFiles(bucket, folderPath = '') {
  const { data, error } = await supabase.storage.from(bucket).list(folderPath);
  if (error) {
    console.error(`Error listing folder ${folderPath}:`, error.message);
    return [];
  }

  let files = [];
  for (const item of data) {
    if (item.id === null) {
      // It's a subfolder
      const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
      const subFiles = await listAllFiles(bucket, subPath);
      files.push(...subFiles);
    } else {
      // It's a file
      const filePath = folderPath ? `${folderPath}/${item.name}` : item.name;
      // Skip empty placeholder files sometimes created by UI
      if (item.name !== '.emptyFolderPlaceholder') {
        files.push(filePath);
      }
    }
  }
  return files;
}

async function backupStorage(filesDir) {
  console.log('\n📁 Starting Storage/Files Backup...');
  
  const bucketName = 'documents';
  const allFiles = await listAllFiles(bucketName);
  
  console.log(`   Found ${allFiles.length} files to download.`);
  
  for (const filePath of allFiles) {
    const { data, error } = await supabase.storage.from(bucketName).download(filePath);
    
    if (error) {
      console.error(`   ❌ Failed to download ${filePath}:`, error.message);
      continue;
    }
    
    // Ensure nested directories exist locally
    const localFilePath = path.join(filesDir, filePath);
    const localFileDir = path.dirname(localFilePath);
    if (!fs.existsSync(localFileDir)) {
      fs.mkdirSync(localFileDir, { recursive: true });
    }
    
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);
    console.log(`   ✅ Downloaded: ${filePath}`);
  }
}

async function runBackup() {
  console.log('================================================');
  console.log('🌞 SOLAR CRM - AUTOMATED LOCAL BACKUP');
  console.log('================================================\n');
  
  // Note: For this script to work on protected tables, you need to be signed in
  // or use the Supabase Service Role Key instead of the Anon Key.
  // Using Anon Key relies on your RLS policies allowing SELECT.
  
  try {
    const { dbDir, filesDir } = await createBackupFolder();
    
    await backupDatabase(dbDir);
    await backupStorage(filesDir);
    
    console.log('\n🎉 Backup Completed Successfully!');
    console.log(`Check the "backups" folder in your project root.`);
  } catch (err) {
    console.error('\n❌ Backup failed with error:', err);
  }
}

runBackup();
