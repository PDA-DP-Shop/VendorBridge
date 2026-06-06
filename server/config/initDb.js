const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const init = async () => {
  // Discrete connection credentials
  const dbUser = process.env.DB_USER || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

  // 1. Connect to standard default PostgreSQL database 'postgres' to create the application database
  const clientConfig = {
    user: dbUser,
    host: dbHost,
    password: dbPassword,
    port: dbPort,
    database: 'postgres', 
  };

  let client = new Client(clientConfig);
  let connected = false;

  // Try standard default databases
  const defaultDbs = ['postgres', 'template1'];
  for (const dbName of defaultDbs) {
    try {
      clientConfig.database = dbName;
      client = new Client(clientConfig);
      await client.connect();
      connected = true;
      console.log(`Connected to default database: "${dbName}"`);
      break;
    } catch (err) {
      console.warn(`Could not connect to default database "${dbName}":`, err.message);
    }
  }

  if (!connected) {
    console.error('FATAL: Could not connect to any default PostgreSQL databases to initialize the project.');
    process.exit(1);
  }

  try {
    // Check if vendorbridge database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'vendorbridge'");
    if (res.rows.length === 0) {
      await client.query('CREATE DATABASE vendorbridge');
      console.log('Database "vendorbridge" created successfully');
    } else {
      console.log('Database "vendorbridge" already exists');
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await client.end();
  }

  // 2. Connect directly to the vendorbridge database and execute schema.sql
  const appClientConfig = {
    user: dbUser,
    host: dbHost,
    password: dbPassword,
    port: dbPort,
    database: 'vendorbridge',
  };

  client = new Client(appClientConfig);

  try {
    await client.connect();
    console.log('Connected to "vendorbridge" database successfully');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);
    console.log('Database tables, indices, and constraints created successfully');
  } catch (err) {
    console.error('Error executing schema.sql setup:', err.message);
  } finally {
    await client.end();
  }
};

init();
