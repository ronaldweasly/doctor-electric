// =============================================================================
// Clients CRUD Routes
// =============================================================================
// Full CRUD for all CRM entities (clients, workflow, surveys, etc.)
// All routes require authentication (applied in server.ts)
// =============================================================================

import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authorize } from '../middleware/auth.js';
import { withTransaction } from '../db/transaction.js';

export const clientsRouter = Router();

// ─── GET ALL CLIENTS ────────────────────────────────────────────────────────
clientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM clients');
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated data
    const result = await query(
      'SELECT * FROM clients ORDER BY created_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ─── GET SINGLE CLIENT (with all related data) ─────────────────────────────
clientsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [client, workflow, survey, quotation, installation, subsidy, payment, documents] =
      await Promise.all([
        query('SELECT * FROM clients WHERE id = $1', [id]),
        query('SELECT * FROM workflow_status WHERE client_id = $1', [id]),
        query('SELECT * FROM surveys WHERE client_id = $1', [id]),
        query('SELECT * FROM quotations WHERE client_id = $1', [id]),
        query('SELECT * FROM installations WHERE client_id = $1', [id]),
        query('SELECT * FROM subsidies WHERE client_id = $1', [id]),
        query('SELECT * FROM payments WHERE client_id = $1', [id]),
        query('SELECT * FROM documents WHERE client_id = $1', [id]),
      ]);

    if (client.rows.length === 0) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json({
      client: client.rows[0],
      workflow: workflow.rows[0] || null,
      survey: survey.rows[0] || null,
      quotation: quotation.rows[0] || null,
      installation: installation.rows[0] || null,
      subsidy: subsidy.rows[0] || null,
      payment: payment.rows[0] || null,
      documents: documents.rows[0] || null,
    });
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// ─── CREATE CLIENT ──────────────────────────────────────────────────────────
// Only Admin and Sales Team can create clients
clientsRouter.post('/', authorize('Admin', 'Sales Team'), async (req: Request, res: Response) => {
  try {
    const { id, name, phone, address, roof_type, system_size_kw, assigned_to } = req.body;

    const result = await query(
      `INSERT INTO clients (id, name, phone, address, roof_type, system_size_kw, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, phone, address, roof_type, system_size_kw, assigned_to]
    );

    // Create initial workflow status
    await query(
      `INSERT INTO workflow_status (client_id, stage, updated_by)
       VALUES ($1, 'New Lead', $2)`,
      [id, req.user?.email]
    );

    // Log the action
    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user?.email, 'CREATE', 'client', id, JSON.stringify({ name })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// ─── UPDATE CLIENT ──────────────────────────────────────────────────────────
// Only Admin and Sales Team can update clients
clientsRouter.put('/:id', authorize('Admin', 'Sales Team'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, roof_type, system_size_kw, assigned_to } = req.body;

    const result = await query(
      `UPDATE clients 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone),
           address = COALESCE($3, address), 
           roof_type = COALESCE($4, roof_type),
           system_size_kw = COALESCE($5, system_size_kw), 
           assigned_to = COALESCE($6, assigned_to)
       WHERE id = $7 RETURNING *`,
      [name, phone, address, roof_type, system_size_kw, assigned_to, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user?.email, 'UPDATE', 'client', id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// ─── UPDATE WORKFLOW STATUS ─────────────────────────────────────────────────
// Only Admin, Engineer, and Sales Team can update workflow
clientsRouter.put('/:id/workflow', authorize('Admin', 'Engineer', 'Sales Team'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const result = await query(
      `INSERT INTO workflow_status (client_id, stage, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id)
       DO UPDATE SET stage = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [id, stage, req.user?.email]
    );

    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user?.email, 'UPDATE', 'workflow', id, JSON.stringify({ stage })]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating workflow:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ─── UPSERT RELATED DATA ───────────────────────────────────────────────────
// Surveys & Installations: Admin, Engineer only
// Quotations: Admin, Engineer only
// Subsidies & Payments: Admin, Accountant only
// Documents: Admin, Engineer only
const UPSERT_CONFIGS = {
  surveys: { roles: ['Admin', 'Engineer'] },
  quotations: { roles: ['Admin', 'Engineer'] },
  installations: { roles: ['Admin', 'Engineer'] },
  subsidies: { roles: ['Admin', 'Accountant'] },
  payments: { roles: ['Admin', 'Accountant'] },
  documents: { roles: ['Admin', 'Engineer'] },
} as const;

for (const [table, config] of Object.entries(UPSERT_CONFIGS)) {
  clientsRouter.put(
    `/:id/${table}`,
    authorize(...(config.roles as string[])),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const data = req.body;

        // Build dynamic upsert query
        const columns = Object.keys(data).filter(k => k !== 'client_id' && k !== 'id');
        const values = columns.map(c => data[c]);

        const setClauses = columns.map((c, i) => `${c} = $${i + 2}`).join(', ');
        const insertCols = ['client_id', ...columns].join(', ');
        const insertVals = ['$1', ...columns.map((_, i) => `$${i + 2}`)].join(', ');

        const result = await query(
          `INSERT INTO ${table} (${insertCols}) VALUES (${insertVals})
           ON CONFLICT (client_id) DO UPDATE SET ${setClauses}
           RETURNING *`,
          [id, ...values]
        );

        res.json(result.rows[0]);
      } catch (err) {
        console.error(`Error upserting ${table}:`, err);
        res.status(500).json({ error: `Failed to update ${table}` });
      }
    }
  );
}

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
clientsRouter.get('/stats/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalClients,
      stageDistribution,
      recentClients,
      paymentSummary,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM clients'),
      query('SELECT stage, COUNT(*) as count FROM workflow_status GROUP BY stage'),
      query('SELECT * FROM clients ORDER BY created_date DESC LIMIT 5'),
      query(`SELECT 
              COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(SUM(paid_amount), 0) as collected,
              COALESCE(SUM(pending_amount), 0) as pending
             FROM payments`),
    ]);

    res.json({
      totalClients: parseInt(totalClients.rows[0].count),
      stageDistribution: stageDistribution.rows,
      recentClients: recentClients.rows,
      paymentSummary: paymentSummary.rows[0],
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ─── DELETE CLIENT (Admin only) ─────────────────────────────────────────────
clientsRouter.delete('/:id', authorize('Admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use transaction to ensure consistency across related deletions
    await withTransaction(async (txQuery) => {
      // Check if client exists
      const clientCheck = await txQuery('SELECT id FROM clients WHERE id = $1', [id]);
      if (clientCheck.rows.length === 0) {
        throw new Error('Client not found');
      }

      // Delete in order of foreign key dependencies
      // (Relying on database constraints, but being explicit is safer)
      await txQuery('DELETE FROM documents WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM payments WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM subsidies WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM installations WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM quotations WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM surveys WHERE client_id = $1', [id]);
      await txQuery('DELETE FROM workflow_status WHERE client_id = $1', [id]);
      
      // Finally delete the client
      await txQuery('DELETE FROM clients WHERE id = $1', [id]);

      // Log the deletion (this stays outside transaction for audit trail)
    });

    // Log after transaction succeeds
    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user?.email, 'DELETE', 'client', id, JSON.stringify({ cascading: true })]
    );

    res.json({ message: 'Client deleted successfully', id });
  } catch (err: any) {
    console.error('Error deleting client:', err);
    
    if (err.message === 'Client not found') {
      res.status(404).json({ error: 'Client not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete client. Transaction rolled back.' });
    }
  }
});
