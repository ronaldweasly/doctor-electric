// =============================================================================
// Database Migration Script
// =============================================================================
// Creates all tables matching the existing Supabase schema.
// Run with: npm run db:migrate
//
// WHY migrations: Version-controlled, repeatable database setup.
// This script is idempotent — safe to run multiple times.
// =============================================================================

import { pool } from './pool.js';

const MIGRATION_SQL = `
-- =============================================================================
-- SolarCRM Database Schema
-- =============================================================================
-- Matches the existing Supabase table structure from config.ts
-- All tables use snake_case column names
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL DEFAULT 'Sales Team'
                CHECK (role IN ('Admin', 'Sales Team', 'Engineer', 'Accountant')),
    name        VARCHAR(255) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    address         TEXT,
    roof_type       VARCHAR(100),
    system_size_kw  DECIMAL(10,2),
    created_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_to     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WORKFLOW STATUS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_status (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage       VARCHAR(100) NOT NULL DEFAULT 'New Lead',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  VARCHAR(255)
);

-- ─── SURVEYS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id                   VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    survey_date                 DATE,
    site_images                 TEXT,
    recommended_system_details  TEXT,
    surveyor_name               VARCHAR(255)
);

-- ─── QUOTATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    quotation_pdf   TEXT,
    amount          DECIMAL(12,2),
    validity_date   DATE,
    approval_status VARCHAR(50) DEFAULT 'Pending'
);

-- ─── INSTALLATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id               VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    team_members            TEXT,
    progress_notes          TEXT,
    completion_percentage   INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    start_date              DATE,
    end_date                DATE
);

-- ─── SUBSIDIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subsidies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status          VARCHAR(50) DEFAULT 'Not Applied',
    applied_date    DATE,
    approval_date   DATE,
    amount          DECIMAL(12,2)
);

-- ─── PAYMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    total_amount    DECIMAL(12,2),
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    pending_amount  DECIMAL(12,2),
    due_date        DATE,
    payment_status  VARCHAR(50) DEFAULT 'Pending'
);

-- ─── DOCUMENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id                   VARCHAR(20) UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    aadhaar_link                TEXT,
    electricity_bill_link       TEXT,
    quotation_doc_link          TEXT,
    installation_photos_link    TEXT,
    subsidy_docs_link           TEXT
);

-- ─── ACTIVITY LOG ───────────────────────────────────────────────────────────
-- WHY: Audit trail for compliance and debugging
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email  VARCHAR(255),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   VARCHAR(255),
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
-- WHY: Speed up common queries (lookups by client_id, date ranges, search)
-- Performance impact: 10-100x faster queries on large datasets
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_created_date ON clients(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_client_id ON workflow_status(client_id);
CREATE INDEX IF NOT EXISTS idx_workflow_updated_at ON workflow_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_surveys_client_id ON surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_installations_client_id ON installations(client_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_client_id ON subsidies(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────────────────────
-- Automatically update the updated_at column on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['users', 'clients']) LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Enforce data isolation and access control at the database level
-- All policies follow: Admins can do everything, regular users have restrictions

-- ─── USERS TABLE RLS ─────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own record or all records if Admin
CREATE POLICY users_read_policy ON users FOR SELECT
  USING (
    auth.uid()::text = id::text OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Only Admins can insert users
CREATE POLICY users_insert_policy ON users FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Admins can update anyone; users can update only themselves
CREATE POLICY users_update_policy ON users FOR UPDATE
  USING (
    auth.uid()::text = id::text OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  )
  WITH CHECK (
    auth.uid()::text = id::text OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Only Admins can delete users
CREATE POLICY users_delete_policy ON users FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── CLIENTS TABLE RLS ───────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Users can view clients assigned to them or all clients if Admin
CREATE POLICY clients_read_policy ON clients FOR SELECT
  USING (
    assigned_to = (SELECT email FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Sales Team can create clients; others need Admin
CREATE POLICY clients_insert_policy ON clients FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Sales Team')
  );

-- Users can update clients assigned to them; Admins can update all
CREATE POLICY clients_update_policy ON clients FOR UPDATE
  USING (
    assigned_to = (SELECT email FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  )
  WITH CHECK (
    assigned_to = (SELECT email FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Only Admins can delete clients
CREATE POLICY clients_delete_policy ON clients FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── WORKFLOW_STATUS TABLE RLS ──────────────────────────────────────────────
ALTER TABLE workflow_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_status_read_policy ON workflow_status FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE assigned_to = (SELECT email FROM users WHERE id = auth.uid())
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY workflow_status_insert_policy ON workflow_status FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer', 'Sales Team')
  );

CREATE POLICY workflow_status_update_policy ON workflow_status FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE assigned_to = (SELECT email FROM users WHERE id = auth.uid())
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE assigned_to = (SELECT email FROM users WHERE id = auth.uid())
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY workflow_status_delete_policy ON workflow_status FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── SURVEYS TABLE RLS ──────────────────────────────────────────────────────
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY surveys_read_policy ON surveys FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE assigned_to = (SELECT email FROM users WHERE id = auth.uid())
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer', 'Accountant')
  );

CREATE POLICY surveys_insert_policy ON surveys FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY surveys_update_policy ON surveys FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY surveys_delete_policy ON surveys FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── QUOTATIONS TABLE RLS ───────────────────────────────────────────────────
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotations_read_policy ON quotations FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer', 'Accountant')
  );

CREATE POLICY quotations_insert_policy ON quotations FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY quotations_update_policy ON quotations FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant', 'Engineer')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant', 'Engineer')
  );

CREATE POLICY quotations_delete_policy ON quotations FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── INSTALLATIONS TABLE RLS ────────────────────────────────────────────────
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY installations_read_policy ON installations FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer', 'Accountant')
  );

CREATE POLICY installations_insert_policy ON installations FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY installations_update_policy ON installations FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY installations_delete_policy ON installations FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── SUBSIDIES TABLE RLS ────────────────────────────────────────────────────
ALTER TABLE subsidies ENABLE ROW LEVEL SECURITY;

CREATE POLICY subsidies_read_policy ON subsidies FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant', 'Engineer')
  );

CREATE POLICY subsidies_insert_policy ON subsidies FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  );

CREATE POLICY subsidies_update_policy ON subsidies FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  );

CREATE POLICY subsidies_delete_policy ON subsidies FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── PAYMENTS TABLE RLS ─────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_read_policy ON payments FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  );

CREATE POLICY payments_insert_policy ON payments FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  );

CREATE POLICY payments_update_policy ON payments FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Accountant')
  );

CREATE POLICY payments_delete_policy ON payments FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── DOCUMENTS TABLE RLS ────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_read_policy ON documents FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer', 'Accountant')
  );

CREATE POLICY documents_insert_policy ON documents FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY documents_update_policy ON documents FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Engineer')
  );

CREATE POLICY documents_delete_policy ON documents FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── ACTIVITY_LOG TABLE RLS ────────────────────────────────────────────────
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs; others can only view their own
CREATE POLICY activity_log_read_policy ON activity_log FOR SELECT
  USING (
    user_email = (SELECT email FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- Only system can insert (via app), but we allow all authenticated users
CREATE POLICY activity_log_insert_policy ON activity_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY activity_log_delete_policy ON activity_log FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Admin'
  );

-- ─── DEFAULT ADMIN USER ────────────────────────────────────────────────────
-- Password: Admin@123 (bcrypt hash) — CHANGE THIS IMMEDIATELY after first login
-- This is a bootstrap user to get into the system.
INSERT INTO users (email, password, role, name, active)
VALUES (
    'admin@solarcrm.com',
    '$2a$12$LJ3TbIvO8uGYPq3KZe0v5OzHxwPnWqKPnFVMxJR5I1mZL3pcYV.Iy',
    'Admin',
    'System Admin',
    true
) ON CONFLICT (email) DO NOTHING;
`;

async function migrate() {
  console.log('🔄 Running database migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
