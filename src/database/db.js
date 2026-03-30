import SQLite from 'react-native-sqlite-2';

const db = SQLite.openDatabase(
  'poultry.db',
  '1.0',
  'Poultry Database',
  200000
);

console.log("DB initialized");

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
    tx.executeSql(`DROP TABLE IF EXISTS farms`);
    
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
        callback(result.rows.raw());
      },
      (_, error) => {
        console.log("Error fetching users", error);
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
      "SELECT * FROM users WHERE isSynced = 0",
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
                "UPDATE users SET isSynced = 1 WHERE id = ?",
                [user.id]
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
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO farms (user_id, farm_name, location, synced) VALUES (?, ?, ?, 0)`,
      [user_id, farm_name, location],
      (_, result) => {
        console.log("Farm added successfully", result.insertId);
        callback && callback();
      },
      (_, error) => {
        console.log("Error adding farm", error);
        Alert.alert("Error", "Failed to add farm: " + error.message);
        return false;
      }
    );
  });
};

// GET FARMS
export const getFarms = (callback, user_Id = null) => {
  console.log("getFarms called with user_Id:", user_Id);
  db.transaction(tx => {
    const query = user_Id ? `SELECT * FROM farms WHERE user_id = ?` : `SELECT * FROM farms`;
    const params = user_Id ? [user_Id] : [];
    console.log("getFarms query:", query, "params:", params);
    tx.executeSql(
      query,
      params,
      (_, result) => {
        const data = result.rows.raw();
        console.log("getFarms result:", data);
        callback(data);
      },
      (_, error) => console.log("Error fetching farms", error)
    );
  });
};;

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

// Export DB
export default db;