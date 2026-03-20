import SQLite from 'react-native-sqlite-2';

// Open Database
const db = SQLite.openDatabase(
  'poultry.db',
  '1.0',
  'Poultry Farm Database',
  200000
);

// Initialize Database (Create Tables)
export const initDB = () => {
    db.transaction(tx => {

    // USERS TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // FARMS TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS farms (
        farm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        farm_name TEXT,
        location TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(user_id)
      );
    `);

    // BATCHES TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS batches (
        batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        start_date TEXT,
        breed TEXT,
        initial_chicks INTEGER,
        status TEXT,
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id)
      );
    `);

    // FEED RECORDS TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS feed_records (
        feed_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        feed_quantity REAL,
        feed_cost REAL,
        date_recorded TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
      );
    `);

    // MORTALITY TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS mortality_records (
        mortality_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        number_dead INTEGER,
        cause_of_death TEXT,
        date_recorded TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
      );
    `);

    // VACCINATION TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS vaccination_records (
        vaccination_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        vaccine_name TEXT,
        vaccination_date TEXT,
        next_due_date TEXT,
        notes TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
      );
    `);

    // EXPENSES TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        description TEXT,
        amount REAL,
        expense_date TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
      );
    `);

    // SALES TABLE
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sales (
        sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        birds_sold INTEGER,
        price_per_bird REAL,
        total_revenue REAL,
        sale_date TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
      );
    `);

  },
  error => {
    console.log("DB Error: ", error);
  },
  () => {
    console.log("Database initialized successfully");
  });
};

export const createUser = (firstName, lastName, email, password, role) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO users (first_name, last_name, email, password, role)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, email, password, role],
      (_, result) => {
        console.log("User created successfully");
      },
      (_, error) => {
        console.log("Error creating user", error);
      }
    );
  });
};

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

// Export DB
export default db;