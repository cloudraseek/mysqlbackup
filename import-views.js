import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let db_name = process.env.DB_NAME_ONE;
const REMOTE_CONFIG = {
  host: process.env.DB_HOST_ONE,
  user: process.env.DB_USER_ONE,
  password: process.env.DB_PASSWORD_ONE,
  database: db_name
};

const LOCAL_CONFIG = {
  host: process.env.DB_HOST_ONE_LOCAL,
  user: process.env.DB_USER_ONE_LOCAL,
  password: process.env.DB_PASSWORD_ONE_LOCAL,
  database: process.env.DB_NAME_ONE_LOCAL // Local DB must exist
};

(async () => {
    console.log('Connecting with config:', REMOTE_CONFIG);
  const remoteConn = await mysql.createConnection(REMOTE_CONFIG);
  const localConn = await mysql.createConnection(LOCAL_CONFIG);

  console.log('Fetching views from QA...');

  const [views] = await remoteConn.query(`
    SELECT table_name, view_definition 
    FROM information_schema.views 
    WHERE table_schema = ? 
  `, [REMOTE_CONFIG.database]);
  
  for (const view of views) {
      
    let viewName = view.TABLE_NAME
    let createViewSQL = `create view ${view.TABLE_NAME} as ` + view.VIEW_DEFINITION;

    const schemaRegex = new RegExp('`?' + db_name + '`?\\.', 'g');
    createViewSQL = createViewSQL.replaceAll(schemaRegex, '');

    console.log(`Creating view locally: ${viewName}`);
    try {
      // Drop view if exists
      await localConn.query(`DROP VIEW IF EXISTS \`${viewName}\``);
      // Create the view
      await localConn.query(createViewSQL);
    } catch (err) {
      console.error(`❌ Failed to create view ${viewName}:`, err.message);
    }
  }

  await remoteConn.end();
  await localConn.end();
  console.log('✅ View sync complete.');
})();