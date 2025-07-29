const { Client } = require('pg');
const fs = require('fs').promises;

// Database configurations
const devConfig = {
  host: 'localhost',
  port: 5432,
  database: 'broncos_pickems_dev',
  user: 'postgres',
  password: 'password123'
};

const prodConfig = {
  host: '148.230.83.37',
  port: 5432,
  database: 'broncos_pickems',
  user: 'postgres',
  password: 'password123'
};

async function getTableSchema(client, tableName) {
  const result = await client.query(`
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getTableConstraints(client, tableName) {
  const result = await client.query(`
    SELECT 
      constraint_name,
      constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = $1 AND table_schema = 'public'
  `, [tableName]);
  return result.rows;
}

async function getTableIndexes(client, tableName) {
  const result = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = $1 AND schemaname = 'public'
  `, [tableName]);
  return result.rows;
}

async function getAllTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(row => row.table_name);
}

async function syncTableSchema(devClient, prodClient, tableName) {
  console.log(`\n📊 Syncing table: ${tableName}`);
  
  const devSchema = await getTableSchema(devClient, tableName);
  const prodSchema = await getTableSchema(prodClient, tableName);
  
  // Check if table exists in prod
  if (prodSchema.length === 0) {
    console.log(`  ❌ Table ${tableName} does not exist in production`);
    // Get the CREATE TABLE statement from dev
    const createTableResult = await devClient.query(`
      SELECT pg_get_ddl('CREATE TABLE', '${tableName}'::regclass::oid) as ddl
    `);
    console.log(`  ➕ Creating table in production...`);
    await prodClient.query(createTableResult.rows[0].ddl);
    return;
  }
  
  // Compare columns
  const devColumns = new Map(devSchema.map(col => [col.column_name, col]));
  const prodColumns = new Map(prodSchema.map(col => [col.column_name, col]));
  
  // Find missing columns in prod
  for (const [colName, devCol] of devColumns) {
    if (!prodColumns.has(colName)) {
      console.log(`  ➕ Adding column ${colName} to production`);
      
      let dataType = devCol.data_type;
      if (devCol.character_maximum_length) {
        dataType += `(${devCol.character_maximum_length})`;
      } else if (devCol.numeric_precision) {
        dataType += `(${devCol.numeric_precision}`;
        if (devCol.numeric_scale) {
          dataType += `,${devCol.numeric_scale}`;
        }
        dataType += ')';
      }
      
      let alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${dataType}`;
      if (devCol.is_nullable === 'NO') {
        // For NOT NULL columns, we need to add them as nullable first, then update
        alterQuery += ` DEFAULT ${devCol.column_default || 'NULL'}`;
      }
      
      try {
        await prodClient.query(alterQuery);
      } catch (error) {
        console.log(`  ⚠️  Error adding column ${colName}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ Table ${tableName} schema synced`);
}

async function copyGameData(devClient, prodClient) {
  console.log('\n🎮 Copying game data from dev to prod...');
  
  // Tables to copy data from (in order to respect foreign keys)
  const tablesToCopy = ['teams', 'seasons', 'games'];
  
  for (const table of tablesToCopy) {
    console.log(`  📋 Copying ${table}...`);
    
    // Clear existing data in prod
    await prodClient.query(`TRUNCATE TABLE ${table} CASCADE`);
    
    // Get data from dev
    const result = await devClient.query(`SELECT * FROM ${table}`);
    
    if (result.rows.length === 0) {
      console.log(`    ⚠️  No data in ${table}`);
      continue;
    }
    
    // Get column names
    const columns = Object.keys(result.rows[0]).join(', ');
    const placeholders = Object.keys(result.rows[0]).map((_, i) => `$${i + 1}`).join(', ');
    
    // Insert data into prod
    for (const row of result.rows) {
      const values = Object.values(row);
      try {
        await prodClient.query(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values
        );
      } catch (error) {
        console.log(`    ⚠️  Error inserting row: ${error.message}`);
      }
    }
    
    // Reset sequence if needed
    if (table === 'teams' || table === 'seasons' || table === 'games') {
      const maxId = await prodClient.query(`SELECT MAX(id) as max_id FROM ${table}`);
      if (maxId.rows[0].max_id) {
        await prodClient.query(`SELECT setval('${table}_id_seq', $1)`, [maxId.rows[0].max_id]);
      }
    }
    
    console.log(`    ✅ Copied ${result.rows.length} rows`);
  }
}

async function main() {
  const devClient = new Client(devConfig);
  const prodClient = new Client(prodConfig);
  
  try {
    console.log('🔌 Connecting to databases...');
    await devClient.connect();
    await prodClient.connect();
    console.log('✅ Connected to both databases');
    
    // Get all tables from dev
    const devTables = await getAllTables(devClient);
    console.log(`\n📋 Found ${devTables.length} tables in development database`);
    
    // Sync schema for all tables
    for (const table of devTables) {
      await syncTableSchema(devClient, prodClient, table);
    }
    
    // Copy game data
    await copyGameData(devClient, prodClient);
    
    console.log('\n🎉 Database sync completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

// Run the sync
main().catch(console.error);