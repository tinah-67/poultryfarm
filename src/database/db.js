import { Alert } from 'react-native';
import SQLite from 'react-native-sqlite-2';

const db = SQLite.openDatabase(
  'poultry.db',
  '1.0',
  'Poultry Database',
  200000
);

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Users table created"), (_, err) => console.log("Users table error", err));

    // FARMS
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS farms (
        farm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        farm_name TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Farms table created"), (_, err) => console.log("Farms table error", err));

    // BATCHES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS batches (
        batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        start_date TEXT,
        breed TEXT,
        initial_chicks INTEGER,
        status TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Batches table created"), (_, err) => console.log("Batches table error", err));

    // FEED RECORDS
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS feed_records (
        feed_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        feed_quantity REAL,
        feed_cost REAL,
        date_recorded TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Feed records table created"), (_, err) => console.log("Feed records table error", err));

    // MORTALITY
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS mortality_records (
        mortality_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        number_dead INTEGER,
        cause_of_death TEXT,
        date_recorded TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Mortality records table created"), (_, err) => console.log("Mortality records table error", err));

    // VACCINATION
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS vaccination_records (
        vaccination_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        vaccine_name TEXT,
        vaccination_date TEXT,
        next_due_date TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Vaccination records table created"), (_, err) => console.log("Vaccination records table error", err));

    // EXPENSES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        description TEXT,
        amount REAL,
        expense_date TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Expenses table created"), (_, err) => console.log("Expenses table error", err));

    // SALES
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sales (
        sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        birds_sold INTEGER,
        price_per_bird REAL,
        total_revenue REAL,
        sale_date TEXT,
        synced INTEGER DEFAULT 0
      );
    `, [], () => console.log("Sales table created"), (_, err) => console.log("Sales table error", err));

  });
};

// ================= USERS =================

// CREATE USER
export const createUser = (firstName, lastName, email, password, role, callback) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (first_name, last_name, email, password, role, synced)
      VALUES (?, ?, ?, ?, ?, 0)`,
        [firstName, lastName, email, password, role],
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
            await fetch('http://192.168.100.26:3000/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user),
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

// GET FARMS
export const getFarms = (userId, callback) => {
  const normalizedUserId = userId != null ? Number(userId) : null;

  console.log("getFarms called with userId:", userId, "normalized:", normalizedUserId);

  db.transaction(tx => {
    const query =
      normalizedUserId != null
        ? "SELECT * FROM farms WHERE user_id = ?"
        : "SELECT * FROM farms";

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
      `UPDATE farms SET farm_name = ?, location = ?, synced = 0 WHERE farm_id = ?`,
      [farm_name, location, farm_id],
      () => console.log("Farm updated"),
      (_, error) => console.log("Update error", error)
    );
  });
};

// DELETE FARM
export const deleteFarm = (farm_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `DELETE FROM farms WHERE farm_id = ?`,
      [farm_id],
      () => console.log("Farm deleted"),
      (_, error) => console.log("Delete error", error)
    );
  });
};

// CREATE BATCH
export const createBatch = (farm_id, start_date, breed, initial_chicks, callback) => {
  console.log("createBatch called:", { farm_id, start_date, breed, initial_chicks });

  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO batches (farm_id, start_date, breed, initial_chicks, status, synced)
      VALUES (?, ?, ?, ?, 'active', 0)`,
      [farm_id, start_date, breed, initial_chicks],
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
      "SELECT * FROM batches WHERE farm_id = ?",
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

//UPDATE BATCH STATUS
export const updateBatchStatus = (batch_id, status) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE batches SET status = ?, synced = 0 WHERE batch_id = ?`,
      [status, batch_id],
      () => console.log("Batch status updated"),
      (_, error) => console.log("Update error", error)
    );
  });
};

//DELETE BATCH
export const deleteBatch = (batch_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `DELETE FROM batches WHERE batch_id = ?`,
      [batch_id],
      () => console.log("Batch deleted"),
      (_, error) => console.log("Delete error", error)
    );
  });
};

//ADD FEED RECORD
export const addFeedRecord = (batch_id, feed_quantity, feed_cost, date_recorded, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO feed_records (batch_id, feed_quantity, feed_cost, date_recorded, synced)
      VALUES (?, ?, ?, ?, 0)`,
      [batch_id, feed_quantity, feed_cost, date_recorded],
      (_, result) => {
        console.log("Feed record added", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding feed record", error);
        return false;
      }
    );
  });
};

//GET FEED RECORDS BY BATCH ID
export const getFeedRecordsByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM feed_records WHERE batch_id = ?",
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
      `UPDATE feed_records SET feed_quantity = ?, feed_cost = ?, date_recorded = ?, synced = 0 WHERE feed_id = ?`,
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
      `DELETE FROM feed_records WHERE feed_id = ?`,
      [feed_id],
      () => console.log("Feed record deleted"),
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
      "SELECT * FROM mortality_records WHERE batch_id = ? ORDER BY date_recorded DESC, mortality_id DESC",
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
      `DELETE FROM mortality_records WHERE mortality_id = ?`,
      [mortality_id],
      () => console.log("Mortality record deleted"),
      (_, error) => console.log("Delete mortality error", error)
    );
  });
};

// ADD VACCINATION RECORD
export const addVaccinationRecord = (batch_id, vaccine_name, vaccination_date, next_due_date, notes, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO vaccination_records (batch_id, vaccine_name, vaccination_date, next_due_date, notes, synced)
      VALUES (?, ?, ?, ?, ?, 0)`,
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

// GET VACCINATION RECORDS BY BATCH ID
export const getVaccinationRecordsByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM vaccination_records WHERE batch_id = ? ORDER BY vaccination_date DESC, vaccination_id DESC",
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
      `DELETE FROM vaccination_records WHERE vaccination_id = ?`,
      [vaccination_id],
      () => console.log("Vaccination record deleted"),
      (_, error) => console.log("Delete vaccination error", error)
    );
  });
};

// ADD EXPENSE
export const addExpenseRecord = (batch_id, description, amount, expense_date, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO expenses (batch_id, description, amount, expense_date, synced)
      VALUES (?, ?, ?, ?, 0)`,
      [batch_id, description, amount, expense_date],
      (_, result) => {
        console.log("Expense added", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding expense", error);
        return false;
      }
    );
  });
};

// GET EXPENSES BY BATCH ID
export const getExpensesByBatchId = (batch_id, callback) => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM expenses WHERE batch_id = ? ORDER BY expense_date DESC, expense_id DESC",
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

export const deleteExpenseRecord = (expense_id) => {
  db.transaction(tx => {
    tx.executeSql(
      `DELETE FROM expenses WHERE expense_id = ?`,
      [expense_id],
      () => console.log("Expense deleted"),
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
      "SELECT * FROM sales WHERE batch_id = ? ORDER BY sale_date DESC, sale_id DESC",
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
      `DELETE FROM sales WHERE sale_id = ?`,
      [sale_id],
      () => console.log("Sale deleted"),
      (_, error) => console.log("Delete sale error", error)
    );
  });
};

//SYNC FEED RECORDS
export const syncFeedRecords = async () => {
  db.transaction(tx => {
    tx.executeSql(
      "SELECT * FROM feed_records WHERE synced = 0",
      [],
      async (_, results) => {
        const records = results.rows.raw();

        for (let record of records) {
          try {
            await fetch('http://192.168.100.26:3000/feed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record),
            });

            db.transaction(tx2 => {
              tx2.executeSql(
                "UPDATE feed_records SET synced = 1 WHERE feed_id = ?",
                [record.feed_id]
              );
            });

          } catch (err) {
            console.log("Feed sync failed", err);
          }
        }
      }
    );
  });
};

// Export DB
export default db;
