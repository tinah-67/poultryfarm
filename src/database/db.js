import { Alert } from 'react-native';
import SQLite from 'react-native-sqlite-2';

const db = SQLite.openDatabase(
  'poultry.db',
  '1.0',
  'Poultry Database',
  200000
);

const REMEMBERED_SESSION_TTL_MS = 30 * 60 * 1000;

console.log("DB initialized");

const rowsToArray = (rows) => {
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

const getCurrentTimestamp = () => new Date().toISOString();
const roundCurrency = value => Number(Number(value || 0).toFixed(2));
const normalizeFeedType = value => String(value || '').trim().toLowerCase();
const parseNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const softDeleteBatchDescendants = (tx, batchId, deletedAt) => {
  const childTables = [
    { tableName: 'feed_records', idColumn: 'batch_id' },
    { tableName: 'mortality_records', idColumn: 'batch_id' },
    { tableName: 'vaccination_records', idColumn: 'batch_id' },
    { tableName: 'expenses', idColumn: 'batch_id' },
    { tableName: 'sales', idColumn: 'batch_id' },
  ];

  childTables.forEach(({ tableName, idColumn }) => {
    tx.executeSql(
      `UPDATE ${tableName}
       SET deleted_at = ?, synced = 0
       WHERE ${idColumn} = ?
         AND deleted_at IS NULL`,
      [deletedAt, batchId],
      () => console.log(`${tableName} children marked deleted for batch`, batchId),
      (_, error) => {
        console.log(`Error cascading delete for ${tableName}`, error);
        return false;
      }
    );
  });
};

const softDeleteFarmDescendants = (tx, farmId, deletedAt) => {
  tx.executeSql(
    `UPDATE expenses
     SET deleted_at = ?, synced = 0
     WHERE farm_id = ?
       AND deleted_at IS NULL`,
    [deletedAt, farmId],
    () => console.log("Farm expenses marked deleted", farmId),
    (_, error) => {
      console.log("Error cascading delete for farm expenses", error);
      return false;
    }
  );

  tx.executeSql(
    `SELECT batch_id
     FROM batches
     WHERE farm_id = ?
       AND deleted_at IS NULL`,
    [farmId],
    (_, result) => {
      const batches = rowsToArray(result.rows);

      batches.forEach(batch => {
        softDeleteBatchDescendants(tx, batch.batch_id, deletedAt);
      });

      tx.executeSql(
        `UPDATE batches
         SET deleted_at = ?, synced = 0
         WHERE farm_id = ?
           AND deleted_at IS NULL`,
        [deletedAt, farmId],
        () => console.log("Farm batches marked deleted", farmId),
        (_, error) => {
          console.log("Error cascading delete for batches", error);
          return false;
        }
      );
    },
    (_, error) => {
      console.log("Error loading farm batches for cascade delete", error);
      return false;
    }
  );
};

const ensureColumnExists = (tx, tableName, columnName, definition) => {
  tx.executeSql(
    `PRAGMA table_info(${tableName})`,
    [],
    (_, result) => {
      const columns = rowsToArray(result.rows);
      const exists = columns.some(column => column.name === columnName);

      if (exists) {
        return;
      }

      tx.executeSql(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
        [],
        () => console.log(`${columnName} column added to ${tableName}`),
        (_transaction, error) => {
          console.log(`Error adding ${columnName} column to ${tableName}`, error);
          return false;
        }
      );
    },
    (_, error) => {
      console.log(`Error reading schema for ${tableName}`, error);
      return false;
    }
  );
};

// ================= INIT DATABASE =================
export const initDB = () => {
  console.log("initDB called");
  db.transaction(tx => {

    // USERS
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        password TEXT,
        role TEXT,
        owner_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Users table created"), (_, err) => console.log("Users table error", err));

    ensureColumnExists(tx, 'users', 'owner_user_id', 'INTEGER');

    // FARMS
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS farms (
        farm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        farm_name TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Farms table created"), (_, err) => console.log("Farms table error", err));

    ensureColumnExists(tx, 'farms', 'deleted_at', 'TEXT');

    // BATCHES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS batches (
        batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        start_date TEXT,
        breed TEXT,
        initial_chicks INTEGER,
        purchase_cost REAL DEFAULT 0,
        status TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Batches table created"), (_, err) => console.log("Batches table error", err));

    ensureColumnExists(tx, 'batches', 'purchase_cost', 'REAL DEFAULT 0');
    ensureColumnExists(tx, 'batches', 'deleted_at', 'TEXT');

    // FEED RECORDS
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS feed_records (
        feed_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        feed_type TEXT,
        feed_quantity REAL,
        feed_cost REAL,
        date_recorded TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Feed records table created"), (_, err) => console.log("Feed records table error", err));

    ensureColumnExists(tx, 'feed_records', 'feed_type', 'TEXT');
    ensureColumnExists(tx, 'feed_records', 'deleted_at', 'TEXT');

    // MORTALITY
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS mortality_records (
        mortality_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        number_dead INTEGER,
        cause_of_death TEXT,
        date_recorded TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Mortality records table created"), (_, err) => console.log("Mortality records table error", err));

    ensureColumnExists(tx, 'mortality_records', 'deleted_at', 'TEXT');

    // VACCINATION
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS vaccination_records (
        vaccination_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        vaccine_name TEXT,
        vaccination_date TEXT,
        next_due_date TEXT,
        due_completed_at TEXT,
        notes TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Vaccination records table created"), (_, err) => console.log("Vaccination records table error", err));

    ensureColumnExists(tx, 'vaccination_records', 'deleted_at', 'TEXT');
    ensureColumnExists(tx, 'vaccination_records', 'due_completed_at', 'TEXT');

    // EXPENSES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        batch_id INTEGER,
        description TEXT,
        amount REAL,
        expense_date TEXT,
        expense_scope TEXT DEFAULT 'batch',
        feed_type TEXT,
        quantity_bought REAL,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Expenses table created"), (_, err) => console.log("Expenses table error", err));

    ensureColumnExists(tx, 'expenses', 'farm_id', 'INTEGER');
    ensureColumnExists(tx, 'expenses', 'expense_scope', `TEXT DEFAULT 'batch'`);
    ensureColumnExists(tx, 'expenses', 'feed_type', 'TEXT');
    ensureColumnExists(tx, 'expenses', 'quantity_bought', 'REAL');
    ensureColumnExists(tx, 'expenses', 'deleted_at', 'TEXT');

    // SALES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sales (
        sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        birds_sold INTEGER,
        price_per_bird REAL,
        total_revenue REAL,
        sale_date TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Sales table created"), (_, err) => console.log("Sales table error", err));

    ensureColumnExists(tx, 'sales', 'deleted_at', 'TEXT');

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS app_session (
        session_id INTEGER PRIMARY KEY CHECK (session_id = 1),
        user_id INTEGER,
        remembered_at TEXT
      );
    `, [], () => console.log("App session table created"), (_, err) => console.log("App session table error", err));

    ensureColumnExists(tx, 'app_session', 'remembered_at', 'TEXT');

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS notification_delivery_log (
        notification_id TEXT PRIMARY KEY,
        delivered_at TEXT NOT NULL
      );
    `, [], () => console.log("Notification delivery log table created"), (_, err) => console.log("Notification delivery log table error", err));

  });
};

// ================= USERS =================

// CREATE USER
export const createUser = (firstName, lastName, email, password, role, ownerUserId = null, callback) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (first_name, last_name, email, password, role, owner_user_id, synced)
      VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [firstName, lastName, email, password, role, ownerUserId],
        (_, result) => {
          console.log("User created");
          callback && callback();
          resolve(result);
        },
        (_, error) => {
          console.log("Error creating user", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// GET USERS
export const getUsers = (callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM users`,
      [],
      (_, result) => {
        callback(rowsToArray(result.rows));
      },
      (_, error) => {
        console.log("Error fetching users", error);
      }
    );
  });
};

// GET USER BY ID
export const getUserById = (userId, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId],
      (_, result) => {
        if (result.rows.length > 0) {
          callback(result.rows.item(0));
        } else {
          callback(null);
        }
      },
      (_, error) => {
        console.log("Error fetching user by id", error);
      }
    );
  });
};

// Use rLogin
export const loginUser = (email, password, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM users WHERE email = ? AND password = ?`,
      [email, password],
      (_, result) => {
        if (result.rows.length > 0) {
          callback(result.rows.item(0)); // user found
        } else {
          callback(null); // no user
        }
      },
      (_, error) => {
        console.log("Login error", error);
      }
    );
  });
};

//synusc users to server
export const syncUsers = async () => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM users WHERE synced = 0",
      [],
      async (_, results) => {
        const users = results.rows.raw();

        for (let user of users) {
          try {
            await fetch('http://192.168.137.1:3000/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                password: user.password,
                role: user.role,
                owner_user_id: user.owner_user_id,
              }),
            });

            db.transaction(tx2 => {
              tx2.executeSql(
                "UPDATE users SET synced = 1 WHERE user_id = ?",
                [user.user_id]
              );
            });

          } catch (err) {
            console.log("Sync failed", err);
          }
        }
      }
    );
  });
};

// ================= FARMS =================

// CREATE FARM
export const createFarm = (user_id, farm_name, location, callback) => {
  console.log("createFarm called with:", { user_id, farm_name, location });
  let insertId = null;

  db.transaction(
    tx => {
      console.log("createFarm tx started");
      tx.executeSql(
        `INSERT INTO farms (user_id, farm_name, location, synced) VALUES (?, ?, ?, 0)`,
        [user_id, farm_name, location],
        (_, result) => {
          insertId = result.insertId;
          console.log("Farm added successfully", insertId, { user_id, farm_name, location });
        },
        (_, error) => {
          console.log("Error adding farm", error);
          Alert.alert("Error", "Failed to add farm: " + error.message);
          return false;
        }
      );
    },
    error => {
      console.log("createFarm transaction error", error);
    },
    () => {
      console.log("createFarm transaction committed", insertId);
      callback && callback(insertId);
    }
  );
};

export const farmExistsForUser = (userId, farmName, location, callback) => {
  const normalizedFarmName = farmName.trim().toLowerCase();
  const normalizedLocation = location.trim().toLowerCase();

  db.transaction(tx => {
    tx.executeSql(
        `SELECT farm_id FROM farms
        WHERE user_id = ?
        AND LOWER(TRIM(farm_name)) = ?
        AND LOWER(TRIM(location)) = ?
        LIMIT 1`,
      [userId, normalizedFarmName, normalizedLocation],
      (_, result) => {
        callback(result.rows.length > 0);
      },
      (_, error) => {
        console.log("Error checking duplicate farm", error);
        callback(false);
        return false;
      }
    );
  });
};

export const getAccessibleOwnerId = (userId, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT user_id, role, owner_user_id FROM users WHERE user_id = ?`,
      [userId],
      (_, result) => {
        if (result.rows.length === 0) {
          callback(null, null);
          return;
        }

        const user = result.rows.item(0);
        const ownerId = user.role === 'owner' ? user.user_id : user.owner_user_id;
        callback(ownerId ?? null, user);
      },
      (_, error) => {
        console.log("Error resolving accessible owner id", error);
        callback(null, null);
        return false;
      }
    );
  });
};

export const getUserByEmail = (email, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`,
      [email],
      (_, result) => {
        if (result.rows.length > 0) {
          callback(result.rows.item(0));
        } else {
          callback(null);
        }
      },
      (_, error) => {
        console.log("Error fetching user by email", error);
        callback(null);
        return false;
      }
    );
  });
};

// GET FARMS
export const getFarms = (userId, callback) => {
  const normalizedUserId = userId != null ? Number(userId) : null;

  console.log("getFarms called with userId:", userId, "normalized:", normalizedUserId);

  db.transaction(tx => {
    const query =
      normalizedUserId != null
        ? "SELECT * FROM farms WHERE user_id = ? AND deleted_at IS NULL"
        : "SELECT * FROM farms WHERE deleted_at IS NULL";

    const params =
      normalizedUserId != null ? [normalizedUserId] : [];

    console.log("getFarms query:", query, "params:", params);

    tx.executeSql(
      query,
      params,
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("getFarms result:", data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching farms", error);
      }
    );
  });
};

// UPDATE FARM
export const updateFarm = (farm_id, farm_name, location) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE farms SET farm_name = ?, location = ?, deleted_at = NULL, synced = 0 WHERE farm_id = ?`,
      [farm_name, location, farm_id],
      () => console.log("Farm updated"),
      (_, error) => console.log("Update error", error)
    );
  });
};

// DELETE FARM
export const deleteFarm = (farm_id) => {
  db.transaction(tx => {
    const deletedAt = getCurrentTimestamp();

    softDeleteFarmDescendants(tx, farm_id, deletedAt);

    tx.executeSql(
      `UPDATE farms SET deleted_at = ?, synced = 0 WHERE farm_id = ?`,
      [deletedAt, farm_id],
      () => console.log("Farm marked deleted"),
      (_, error) => console.log("Delete error", error)
    );
  });
};

// CREATE BATCH
export const createBatch = (farm_id, start_date, breed, initial_chicks, purchase_cost, callback) => {
  console.log("createBatch called:", { farm_id, start_date, breed, initial_chicks, purchase_cost });

  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO batches (farm_id, start_date, breed, initial_chicks, purchase_cost, status, synced)
        VALUES (?, ?, ?, ?, ?, 'active', 0)`,
      [farm_id, start_date, breed, initial_chicks, purchase_cost],
      (_, result) => {
        console.log("Batch created:", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error creating batch", error);
        return false;
      }
    );
  });
};

//GET BATCHES BY FARM ID
export const getBatchesByFarmId = (farm_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM batches WHERE farm_id = ? AND deleted_at IS NULL",
      [farm_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Batches for farm:", farm_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching batches", error);
      }
    );
  });
};

export const saveRememberedSession = (userId, callback) => {
  const rememberedAt = new Date().toISOString();

  db.transaction(tx => {
    tx.executeSql(
      `INSERT OR REPLACE INTO app_session (session_id, user_id, remembered_at) VALUES (1, ?, ?)`,
      [userId, rememberedAt],
      () => {
        console.log("Remembered session saved");
        callback && callback();
      },
      (_, error) => {
        console.log("Error saving remembered session", error);
        return false;
      }
    );
  });
};

export const getAccessibleFarms = (userId, callback) => {
  const normalizedUserId = userId != null ? Number(userId) : null;

  if (normalizedUserId == null) {
    callback([]);
    return;
  }

  db.transaction(tx => {
    tx.executeSql(
        `SELECT farms.*
        FROM farms
        JOIN users ON users.user_id = ?
        WHERE farms.user_id = CASE
          WHEN users.role = 'owner' THEN users.user_id
          ELSE users.owner_user_id
        END
        AND farms.deleted_at IS NULL
        ORDER BY farms.created_at DESC, farms.farm_id DESC`,
        [normalizedUserId],
      (_, result) => {
        callback(rowsToArray(result.rows));
      },
      (_, error) => {
        console.log("Error fetching accessible farms", error);
        callback([]);
        return false;
      }
    );
  });
};

export const clearRememberedSession = (callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `DELETE FROM app_session WHERE session_id = 1`,
      [],
      () => {
        console.log("Remembered session cleared");
        callback && callback();
      },
      (_, error) => {
        console.log("Error clearing remembered session", error);
        return false;
      }
    );
  });
};

export const getRememberedSession = (callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT user_id, remembered_at FROM app_session WHERE session_id = 1`,
      [],
      (_, result) => {
        if (result.rows.length === 0) {
          callback(null);
          return;
        }

        const session = result.rows.item(0);
        const rememberedAtMs = session.remembered_at ? Date.parse(session.remembered_at) : NaN;
        const isExpired =
          Number.isNaN(rememberedAtMs) ||
          Date.now() - rememberedAtMs > REMEMBERED_SESSION_TTL_MS;

        if (isExpired) {
          tx.executeSql(
            `DELETE FROM app_session WHERE session_id = 1`,
            [],
            () => {
              console.log("Expired remembered session cleared");
              callback(null);
            },
            () => {
              callback(null);
              return false;
            }
          );
          return;
        }

        callback(session);
      },
      (_, error) => {
        console.log("Error fetching remembered session", error);
        callback(null);
        return false;
      }
    );
  });
};

export const getNotificationDeliveryLog = (notificationIds, callback) => {
  if (!notificationIds?.length) {
    callback({});
    return;
  }

  const placeholders = notificationIds.map(() => '?').join(', ');

  db.transaction(tx => {
    tx.executeSql(
      `SELECT notification_id, delivered_at
       FROM notification_delivery_log
       WHERE notification_id IN (${placeholders})`,
      notificationIds,
      (_, result) => {
        const entries = rowsToArray(result.rows).reduce((accumulator, row) => {
          accumulator[row.notification_id] = row.delivered_at;
          return accumulator;
        }, {});

        callback(entries);
      },
      (_, error) => {
        console.log("Error fetching notification delivery log", error);
        callback({});
        return false;
      }
    );
  });
};

export const saveNotificationDeliveries = (notificationIds, callback) => {
  if (!notificationIds?.length) {
    callback && callback();
    return;
  }

  const deliveredAt = new Date().toISOString();

  db.transaction(
    tx => {
      notificationIds.forEach(notificationId => {
        tx.executeSql(
          `INSERT OR REPLACE INTO notification_delivery_log (notification_id, delivered_at)
           VALUES (?, ?)`,
          [notificationId, deliveredAt]
        );
      });
    },
    error => {
      console.log("Error saving notification deliveries", error);
      callback && callback();
    },
    () => {
      callback && callback();
    }
  );
};

export const markUserAsSynced = (userId) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE users SET synced = 1 WHERE user_id = ?`,
      [userId],
      () => console.log("User marked as synced"),
      (_, error) => console.log("Error marking user as synced", error)
    );
  });
};

export const getBatches = getBatchesByFarmId;

export const getBatchById = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM batches WHERE batch_id = ? AND deleted_at IS NULL LIMIT 1`,
      [batch_id],
      (_, result) => {
        if (result.rows.length > 0) {
          callback(result.rows.item(0));
        } else {
          callback(null);
        }
      },
      (_, error) => {
        console.log("Error fetching batch by id", error);
        callback(null);
        return false;
      }
    );
  });
};

export const updateBatchDetails = (batch_id, start_date, breed, initial_chicks, purchase_cost, status, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE batches
        SET start_date = ?, breed = ?, initial_chicks = ?, purchase_cost = ?, status = ?, deleted_at = NULL, synced = 0
        WHERE batch_id = ?`,
      [start_date, breed, initial_chicks, purchase_cost, status, batch_id],
      () => {
        console.log("Batch details updated");
        callback && callback();
      },
      (_, error) => {
        console.log("Batch detail update error", error);
        return false;
      }
    );
  });
};

//UPDATE BATCH STATUS
export const updateBatchStatus = (batch_id, status) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE batches SET status = ?, deleted_at = NULL, synced = 0 WHERE batch_id = ?`,
      [status, batch_id],
      () => console.log("Batch status updated"),
      (_, error) => console.log("Update error", error)
    );
  });
};

//DELETE BATCH
export const deleteBatch = (batch_id) => {
  db.transaction(tx => {
    const deletedAt = getCurrentTimestamp();

    softDeleteBatchDescendants(tx, batch_id, deletedAt);

    tx.executeSql(
      `UPDATE batches SET deleted_at = ?, synced = 0 WHERE batch_id = ?`,
      [deletedAt, batch_id],
      () => console.log("Batch marked deleted"),
      (_, error) => console.log("Delete error", error)
    );
  });
};

const loadFeedAvailabilityForTransaction = (tx, batch_id, feed_type, callback, errorCallback) => {
  const normalizedFeedType = normalizeFeedType(feed_type);

  tx.executeSql(
    `SELECT farm_id
     FROM batches
     WHERE batch_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [batch_id],
    (_, batchResult) => {
      const batchRows = rowsToArray(batchResult.rows);
      const farmId = batchRows[0]?.farm_id;

      if (!farmId || !normalizedFeedType) {
        errorCallback && errorCallback(new Error('A valid batch and feed type are required.'));
        return false;
      }

      tx.executeSql(
        `SELECT COALESCE(SUM(amount), 0) AS total_cost,
                COALESCE(SUM(quantity_bought), 0) AS total_quantity
         FROM expenses
         WHERE farm_id = ?
           AND COALESCE(expense_scope, 'batch') = 'farm'
           AND deleted_at IS NULL
           AND LOWER(TRIM(COALESCE(feed_type, ''))) = ?
           AND quantity_bought IS NOT NULL
           AND quantity_bought > 0`,
        [farmId, normalizedFeedType],
        (_, purchaseResult) => {
          const purchaseRows = rowsToArray(purchaseResult.rows);
          const totalCost = parseNumber(purchaseRows[0]?.total_cost);
          const totalQuantity = parseNumber(purchaseRows[0]?.total_quantity);

          tx.executeSql(
            `SELECT COALESCE(SUM(feed_records.feed_quantity), 0) AS used_quantity
             FROM feed_records
             JOIN batches ON batches.batch_id = feed_records.batch_id
             WHERE batches.farm_id = ?
               AND feed_records.deleted_at IS NULL
               AND LOWER(TRIM(COALESCE(feed_records.feed_type, ''))) = ?`,
            [farmId, normalizedFeedType],
            (_, usageResult) => {
              const usageRows = rowsToArray(usageResult.rows);
              const usedQuantity = parseNumber(usageRows[0]?.used_quantity);

              callback && callback({
                farm_id: farmId,
                feed_type: normalizedFeedType,
                total_cost: roundCurrency(totalCost),
                total_quantity: roundCurrency(totalQuantity),
                used_quantity: roundCurrency(usedQuantity),
                available_quantity: roundCurrency(Math.max(totalQuantity - usedQuantity, 0)),
                unit_cost: totalQuantity > 0 && totalCost > 0
                  ? roundCurrency(totalCost / totalQuantity)
                  : 0,
              });
            },
            (_, error) => {
              console.log("Error calculating used feed quantity", error);
              errorCallback && errorCallback(error);
              return false;
            }
          );
        },
        (_, error) => {
          console.log("Error calculating feed purchase totals", error);
          errorCallback && errorCallback(error);
          return false;
        }
      );
    },
    (_, error) => {
      console.log("Error loading batch farm for feed availability", error);
      errorCallback && errorCallback(error);
      return false;
    }
  );
};

export const getFeedAvailability = (batch_id, feed_type, callback, errorCallback) => {
  db.transaction(tx => {
    loadFeedAvailabilityForTransaction(tx, batch_id, feed_type, callback, errorCallback);
  });
};

//ADD FEED RECORD
export const addFeedRecord = (batch_id, feed_type, feed_quantity, date_recorded, callback, errorCallback) => {
  const quantityValue = parseNumber(feed_quantity);

  db.transaction(tx => {
    loadFeedAvailabilityForTransaction(
      tx,
      batch_id,
      feed_type,
      availability => {
        if (!availability?.farm_id || !availability?.feed_type || quantityValue <= 0) {
          errorCallback && errorCallback(new Error('A valid batch, feed type, and quantity are required.'));
          return false;
        }

        if (availability.total_quantity <= 0 || availability.total_cost <= 0) {
          errorCallback && errorCallback(new Error(`No farm feed purchase found for ${availability.feed_type}. Record it first under farm expenses.`));
          return false;
        }

        if (quantityValue > availability.available_quantity) {
          errorCallback && errorCallback(new Error(`Only ${availability.available_quantity.toFixed(2)} kg of ${availability.feed_type} is available from recorded farm purchases.`));
          return false;
        }

        const feedCost = roundCurrency(quantityValue * availability.unit_cost);

        tx.executeSql(
          `INSERT INTO feed_records (batch_id, feed_type, feed_quantity, feed_cost, date_recorded, synced)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [batch_id, availability.feed_type, quantityValue, feedCost, date_recorded],
          (_, result) => {
            console.log("Feed record added", result.insertId);
            callback && callback({
              feed_id: result.insertId,
              feed_cost: feedCost,
              unit_cost: availability.unit_cost,
              available_quantity: roundCurrency(availability.available_quantity - quantityValue),
            });
          },
          (_, error) => {
            console.log("Error adding feed record", error);
            errorCallback && errorCallback(error);
            return false;
          }
        );
      },
      errorCallback
    );
  });
};

const buildExpenseRecordValues = record => {
  const expenseScope = record.expense_scope || (record.farm_id != null && record.batch_id == null ? 'farm' : 'batch');
  const normalizedFeedType = record.feed_type ? normalizeFeedType(record.feed_type) : null;
  const quantityBought = record.quantity_bought == null || record.quantity_bought === ''
    ? null
    : parseNumber(record.quantity_bought);

  return [
    record.farm_id ?? null,
    record.batch_id ?? null,
    record.description,
    record.amount,
    record.expense_date,
    expenseScope,
    normalizedFeedType,
    quantityBought,
  ];
};

// ADD EXPENSE
export const addExpenseRecord = (input, description, amount, expense_date, callback) => {
  const record = typeof input === 'object' && input !== null
    ? input
    : {
        batch_id: input,
        description,
        amount,
        expense_date,
      };

  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO expenses (farm_id, batch_id, description, amount, expense_date, expense_scope, feed_type, quantity_bought, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      buildExpenseRecordValues(record),
      (_, result) => {
        console.log("Expense added", result.insertId);
        const nextCallback = typeof input === 'object' && input !== null ? description : callback;
        nextCallback && nextCallback();
      },
      (_, error) => {
        console.log("Error adding expense", error);
        return false;
      }
    );
  });
};

//GET FEED RECORDS BY BATCH ID
export const getFeedRecordsByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM feed_records WHERE batch_id = ? AND deleted_at IS NULL",
      [batch_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Feed records for batch:", batch_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching feed records", error);
      }
    );
  });
};

export const getFeedRecordsByBatch = getFeedRecordsByBatchId;

//UPDATE FEED RECORD
export const updateFeedRecord = (feed_id, feed_quantity, feed_cost, date_recorded) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE feed_records SET feed_quantity = ?, feed_cost = ?, date_recorded = ?, deleted_at = NULL, synced = 0 WHERE feed_id = ?`,
      [feed_quantity, feed_cost, date_recorded, feed_id],
      () => console.log("Feed record updated"),
      (_, error) => console.log("Update error", error)
    );
  });
};

//DELETE FEED RECORD
export const deleteFeedRecord = (feed_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE feed_records SET deleted_at = ?, synced = 0 WHERE feed_id = ?`,
      [getCurrentTimestamp(), feed_id],
      () => console.log("Feed record marked deleted"),
      (_, error) => console.log("Delete error", error)
    );
  });
};

// ADD MORTALITY RECORD
export const addMortalityRecord = (batch_id, number_dead, cause_of_death, date_recorded, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO mortality_records (batch_id, number_dead, cause_of_death, date_recorded, synced)
      VALUES (?, ?, ?, ?, 0)`,
      [batch_id, number_dead, cause_of_death, date_recorded],
      (_, result) => {
        console.log("Mortality record added", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding mortality record", error);
        return false;
      }
    );
  });
};

// GET MORTALITY RECORDS BY BATCH ID
export const getMortalityRecordsByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM mortality_records WHERE batch_id = ? AND deleted_at IS NULL ORDER BY date_recorded DESC, mortality_id DESC",
      [batch_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Mortality records for batch:", batch_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching mortality records", error);
      }
    );
  });
};

export const deleteMortalityRecord = (mortality_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE mortality_records SET deleted_at = ?, synced = 0 WHERE mortality_id = ?`,
      [getCurrentTimestamp(), mortality_id],
      () => console.log("Mortality record marked deleted"),
      (_, error) => console.log("Delete mortality error", error)
    );
  });
};

// ADD VACCINATION RECORD
export const addVaccinationRecord = (batch_id, vaccine_name, vaccination_date, next_due_date, notes, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO vaccination_records (batch_id, vaccine_name, vaccination_date, next_due_date, due_completed_at, notes, synced)
      VALUES (?, ?, ?, ?, NULL, ?, 0)`,
      [batch_id, vaccine_name, vaccination_date, next_due_date, notes],
      (_, result) => {
        console.log("Vaccination record added", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding vaccination record", error);
        return false;
      }
    );
  });
};

export const markVaccinationDueCompleted = (vaccination_id, completedAt, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE vaccination_records
       SET due_completed_at = ?, synced = 0
       WHERE vaccination_id = ?`,
      [completedAt, vaccination_id],
      () => {
        console.log("Vaccination due marked completed", vaccination_id);
        callback && callback();
      },
      (_, error) => {
        console.log("Error marking vaccination due completed", error);
        return false;
      }
    );
  });
};

// GET VACCINATION RECORDS BY BATCH ID
export const getVaccinationRecordsByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM vaccination_records WHERE batch_id = ? AND deleted_at IS NULL ORDER BY vaccination_date DESC, vaccination_id DESC",
      [batch_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Vaccination records for batch:", batch_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching vaccination records", error);
      }
    );
  });
};

export const deleteVaccinationRecord = (vaccination_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE vaccination_records SET deleted_at = ?, synced = 0 WHERE vaccination_id = ?`,
      [getCurrentTimestamp(), vaccination_id],
      () => console.log("Vaccination record marked deleted"),
      (_, error) => console.log("Delete vaccination error", error)
    );
  });
};

// GET EXPENSES BY BATCH ID
export const getExpensesByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT *,
              COALESCE(expense_scope, 'batch') AS expense_scope
       FROM expenses
       WHERE batch_id = ?
         AND deleted_at IS NULL
       ORDER BY expense_date DESC, expense_id DESC`,
      [batch_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Expenses for batch:", batch_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching expenses", error);
      }
    );
  });
};

export const getExpensesByFarmId = (farm_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `SELECT *,
              COALESCE(expense_scope, 'batch') AS expense_scope
       FROM expenses
       WHERE farm_id = ?
         AND COALESCE(expense_scope, 'batch') = 'farm'
         AND deleted_at IS NULL
       ORDER BY expense_date DESC, expense_id DESC`,
      [farm_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Farm expenses for farm:", farm_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching farm expenses", error);
      }
    );
  });
};

export const deleteExpenseRecord = (expense_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE expenses SET deleted_at = ?, synced = 0 WHERE expense_id = ?`,
      [getCurrentTimestamp(), expense_id],
      () => console.log("Expense marked deleted"),
      (_, error) => console.log("Delete expense error", error)
    );
  });
};

// ADD SALE
export const addSaleRecord = (batch_id, birds_sold, price_per_bird, sale_date, callback) => {
  const total_revenue = Number(birds_sold) * Number(price_per_bird);

  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO sales (batch_id, birds_sold, price_per_bird, total_revenue, sale_date, synced)
      VALUES (?, ?, ?, ?, ?, 0)`,
      [batch_id, birds_sold, price_per_bird, total_revenue, sale_date],
      (_, result) => {
        console.log("Sale added", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding sale", error);
        return false;
      }
    );
  });
};

// GET SALES BY BATCH ID
export const getSalesByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM sales WHERE batch_id = ? AND deleted_at IS NULL ORDER BY sale_date DESC, sale_id DESC",
      [batch_id],
      (_, result) => {
        const data = rowsToArray(result.rows);
        console.log("Sales for batch:", batch_id, data);
        callback(data);
      },
      (_, error) => {
        console.log("Error fetching sales", error);
      }
    );
  });
};

export const deleteSaleRecord = (sale_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE sales SET deleted_at = ?, synced = 0 WHERE sale_id = ?`,
      [getCurrentTimestamp(), sale_id],
      () => console.log("Sale marked deleted"),
      (_, error) => console.log("Delete sale error", error)
    );
  });
};

const executeTransactionSteps = (tx, steps) =>
  new Promise((resolve, reject) => {
    const runStep = index => {
      if (index >= steps.length) {
        resolve();
        return;
      }

      const step = steps[index];

      tx.executeSql(
        step.sql,
        step.params,
        () => runStep(index + 1),
        (_transaction, error) => {
          reject(error);
          return false;
        }
      );
    };

    runStep(0);
  });

export const importBootstrapData = (authenticatedUser, bootstrapData) =>
  new Promise((resolve, reject) => {
    const safeData = bootstrapData || {};
    const importedUsers = (safeData.users || []).map(user => ({
      user_id: user.user_id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: String(user.email || '').trim().toLowerCase(),
      password: user.user_id === authenticatedUser.user_id ? authenticatedUser.password : '',
      role: user.role || '',
      owner_user_id: user.owner_user_id ?? null,
      created_at: user.created_at ?? null,
    }));

    const steps = [
      ...importedUsers.map(user => ({
        sql: `
          INSERT OR REPLACE INTO users
          (user_id, first_name, last_name, email, password, role, owner_user_id, created_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), 1)
        `,
        params: [
          user.user_id,
          user.first_name,
          user.last_name,
          user.email,
          user.password,
          user.role,
          user.owner_user_id,
          user.created_at,
        ],
      })),
      ...(safeData.farms || []).map(farm => ({
        sql: `
          INSERT OR REPLACE INTO farms
          (farm_id, user_id, farm_name, location, created_at, deleted_at, synced)
          VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, 1)
        `,
        params: [farm.farm_id, farm.user_id, farm.farm_name, farm.location, farm.created_at, farm.deleted_at ?? null],
      })),
      ...(safeData.batches || []).map(batch => ({
        sql: `
          INSERT OR REPLACE INTO batches
          (batch_id, farm_id, start_date, breed, initial_chicks, purchase_cost, status, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          batch.batch_id,
          batch.farm_id,
          batch.start_date,
          batch.breed,
          batch.initial_chicks,
          batch.purchase_cost ?? 0,
          batch.status,
          batch.deleted_at ?? null,
        ],
      })),
      ...(safeData.feed_records || []).map(record => ({
        sql: `
          INSERT OR REPLACE INTO feed_records
          (feed_id, batch_id, feed_type, feed_quantity, feed_cost, date_recorded, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          record.feed_id,
          record.batch_id,
          record.feed_type,
          record.feed_quantity,
          record.feed_cost,
          record.date_recorded,
          record.deleted_at ?? null,
        ],
      })),
      ...(safeData.mortality_records || []).map(record => ({
        sql: `
          INSERT OR REPLACE INTO mortality_records
          (mortality_id, batch_id, number_dead, cause_of_death, date_recorded, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          record.mortality_id,
          record.batch_id,
          record.number_dead,
          record.cause_of_death,
          record.date_recorded,
          record.deleted_at ?? null,
        ],
      })),
      ...(safeData.vaccination_records || []).map(record => ({
        sql: `
          INSERT OR REPLACE INTO vaccination_records
          (vaccination_id, batch_id, vaccine_name, vaccination_date, next_due_date, due_completed_at, notes, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          record.vaccination_id,
          record.batch_id,
          record.vaccine_name,
          record.vaccination_date,
          record.next_due_date,
          record.due_completed_at ?? null,
          record.notes,
          record.deleted_at ?? null,
        ],
      })),
      ...(safeData.expenses || []).map(record => ({
        sql: `
          INSERT OR REPLACE INTO expenses
          (expense_id, farm_id, batch_id, description, amount, expense_date, expense_scope, feed_type, quantity_bought, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          record.expense_id,
          record.farm_id ?? null,
          record.batch_id,
          record.description,
          record.amount,
          record.expense_date,
          record.expense_scope ?? (record.farm_id != null && record.batch_id == null ? 'farm' : 'batch'),
          record.feed_type ? normalizeFeedType(record.feed_type) : null,
          record.quantity_bought ?? null,
          record.deleted_at ?? null,
        ],
      })),
      ...(safeData.sales || []).map(record => ({
        sql: `
          INSERT OR REPLACE INTO sales
          (sale_id, batch_id, birds_sold, price_per_bird, total_revenue, sale_date, deleted_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        params: [
          record.sale_id,
          record.batch_id,
          record.birds_sold,
          record.price_per_bird,
          record.total_revenue,
          record.sale_date,
          record.deleted_at ?? null,
        ],
      })),
    ];

    db.transaction(
      tx => {
        executeTransactionSteps(tx, steps)
          .then(() => resolve(authenticatedUser))
          .catch(reject);
      },
      error => {
        reject(error);
      }
    );
  });

// Export DB
export default db;
