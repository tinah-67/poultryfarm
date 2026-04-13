import db from '../database/db';

const BACKUP_BASE_URL = 'https://broilerhub.onrender.com';

const tableConfigs = [
  {
    key: 'users',
    tableName: 'users',
    idColumn: 'user_id',
    endpoint: 'users',
    selectSql: `
      SELECT user_id, first_name, last_name, email, password, role, owner_user_id, created_at
      FROM users
      WHERE synced = 0
      ORDER BY CASE WHEN owner_user_id IS NULL THEN 0 ELSE 1 END, user_id
    `,
  },
  {
    key: 'farms',
    tableName: 'farms',
    idColumn: 'farm_id',
    endpoint: 'farms',
    selectSql: `
      SELECT farms.farm_id, farms.user_id, farms.farm_name, farms.location, farms.created_at, farms.deleted_at
      FROM farms
      JOIN users ON users.user_id = farms.user_id
      WHERE farms.synced = 0
        AND users.synced = 1
      ORDER BY farm_id
    `,
  },
  {
    key: 'batches',
    tableName: 'batches',
    idColumn: 'batch_id',
    endpoint: 'batches',
    selectSql: `
      SELECT batches.batch_id, batches.farm_id, batches.start_date, batches.breed, batches.initial_chicks, batches.purchase_cost, batches.status, batches.deleted_at
      FROM batches
      JOIN farms ON farms.farm_id = batches.farm_id
      WHERE batches.synced = 0
        AND farms.synced = 1
      ORDER BY batch_id
    `,
  },
  {
    key: 'feed_records',
    tableName: 'feed_records',
    idColumn: 'feed_id',
    endpoint: 'feed-records',
    selectSql: `
      SELECT feed_records.feed_id, feed_records.batch_id, feed_records.feed_type, feed_records.feed_quantity, feed_records.feed_cost, feed_records.date_recorded, feed_records.deleted_at
      FROM feed_records
      JOIN batches ON batches.batch_id = feed_records.batch_id
      WHERE feed_records.synced = 0
        AND batches.synced = 1
      ORDER BY feed_id
    `,
  },
  {
    key: 'mortality_records',
    tableName: 'mortality_records',
    idColumn: 'mortality_id',
    endpoint: 'mortality-records',
    selectSql: `
      SELECT mortality_records.mortality_id, mortality_records.batch_id, mortality_records.number_dead, mortality_records.cause_of_death, mortality_records.date_recorded, mortality_records.deleted_at
      FROM mortality_records
      JOIN batches ON batches.batch_id = mortality_records.batch_id
      WHERE mortality_records.synced = 0
        AND batches.synced = 1
      ORDER BY mortality_id
    `,
  },
  {
    key: 'vaccination_records',
    tableName: 'vaccination_records',
    idColumn: 'vaccination_id',
    endpoint: 'vaccination-records',
    selectSql: `
      SELECT vaccination_records.vaccination_id, vaccination_records.batch_id, vaccination_records.vaccine_name, vaccination_records.vaccination_date, vaccination_records.next_due_date, vaccination_records.notes, vaccination_records.deleted_at
      FROM vaccination_records
      JOIN batches ON batches.batch_id = vaccination_records.batch_id
      WHERE vaccination_records.synced = 0
        AND batches.synced = 1
      ORDER BY vaccination_id
    `,
  },
  {
    key: 'expenses',
    tableName: 'expenses',
    idColumn: 'expense_id',
    endpoint: 'expenses',
    selectSql: `
      SELECT expenses.expense_id, expenses.batch_id, expenses.description, expenses.amount, expenses.expense_date, expenses.deleted_at
      FROM expenses
      JOIN batches ON batches.batch_id = expenses.batch_id
      WHERE expenses.synced = 0
        AND batches.synced = 1
      ORDER BY expense_id
    `,
  },
  {
    key: 'sales',
    tableName: 'sales',
    idColumn: 'sale_id',
    endpoint: 'sales',
    selectSql: `
      SELECT sales.sale_id, sales.batch_id, sales.birds_sold, sales.price_per_bird, sales.total_revenue, sales.sale_date, sales.deleted_at
      FROM sales
      JOIN batches ON batches.batch_id = sales.batch_id
      WHERE sales.synced = 0
        AND batches.synced = 1
      ORDER BY sale_id
    `,
  },
];

const rowsToArray = rows => {
  if (!rows) {
    return [];
  }

  if (typeof rows.raw === 'function') {
    return rows.raw();
  }

  const items = [];
  for (let index = 0; index < rows.length; index += 1) {
    items.push(rows.item(index));
  }

  return items;
};

const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });

const getUnsyncedRecords = async config => {
  const result = await executeSql(config.selectSql);
  return rowsToArray(result.rows);
};

const markRecordsAsSynced = async (tableName, idColumn, ids) => {
  if (!ids.length) {
    return;
  }

  const placeholders = ids.map(() => '?').join(', ');

  await executeSql(
    `UPDATE ${tableName} SET synced = 1 WHERE ${idColumn} IN (${placeholders})`,
    ids
  );
};

const syncTable = async config => {
  const records = await getUnsyncedRecords(config);

  if (!records.length) {
    return { key: config.key, syncedCount: 0 };
  }

  const response = await fetch(`${BACKUP_BASE_URL}/backup/${config.endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backup sync failed for ${config.key}: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const syncedIds = Array.isArray(payload?.syncedIds)
    ? payload.syncedIds
    : records.map(record => record[config.idColumn]);

  await markRecordsAsSynced(config.tableName, config.idColumn, syncedIds);

  return { key: config.key, syncedCount: syncedIds.length };
};

export const syncPendingBackup = async () => {
  const results = [];

  for (const config of tableConfigs) {
    const result = await syncTable(config);
    results.push(result);
  }

  return results;
};
