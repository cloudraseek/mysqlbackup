import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createInterface } from 'readline/promises';
import 'dotenv/config'

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
.option('dump-only', {
  alias: 'do',
  describe: 'only dumps the table to ./tables/',
  type: 'boolean',
  default: false
})
.option('import-only', {
  alias: 'io',
  describe: 'only imports the table from ./tables/',
  type: 'boolean',
  default: false
})
.option('select-table', {
  alias: 'st',
  describe: 'select specific tables to process (space-separated)',
  type: 'string'
})
.option('--db',{
  alias:"db",
  describe:"let me select database",
  type:'boolean',
  default:false
})
.help()
.alias('help', 'h')
.argv;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readline = async (message) => {
  const line = await rl.question(message)
  return line;
};



// const args = process.argv.slice(2);



// const host = process.env.DB_HOST_ONE;
// const user = process.env.DB_USER_ONE;
// const password = process.env.DB_PASSWORD_ONE;
// const database = process.env.DB_NAME_ONE;

// const database_local = process.env.DB_NAME_ONE_LOCAL

const allTables = "agent_info backup_signature bundled_plans carrier_info cust_addresses dependent_policies dependents elevatedv_backup_new gid_assoc_fee group_census group_census_report group_info group_plans group_select_policy group_select_rule iha_admin_plan_selection iha_email_answers iha_email_questionnaires iha_files_generated_users iha_pdf_history_infos iha_policies_predictions med_medications new_assoc_fee payment_eft plan_policies plan_policies_member plan_pricing plan_tier plans policies policy_updates rep_assoc_fee rep_assoc_fee_waive signatures tier_updates user_activity_details userinfo annual_income";
const outputFolder = 'tables';

const databaseOptions = [
  {
    id: 1,
    name: 'Remote Production',
    host: process.env.DB_HOST_ONE,
    user: process.env.DB_USER_ONE,
    password: process.env.DB_PASSWORD_ONE,
    database: process.env.DB_NAME_ONE,
    port: process.env.DB_PORT_ONE
  },
  {
    id: 2,
    name: 'Remote QA',
    host: process.env.DB_HOST_TWO,
    user: process.env.DB_USER_TWO,
    password: process.env.DB_PASSWORD_TWO,
    database: process.env.DB_NAME_TWO,
    port: process.env.DB_PORT_TWO
  },
  {
    id: 3,
    name: 'Local Production',
    host: process.env.DB_HOST_ONE_LOCAL,
    user: process.env.DB_USER_ONE_LOCAL,
    password: process.env.DB_PASSWORD_ONE_LOCAL,
    database: process.env.DB_NAME_ONE_LOCAL,
    port: process.env.DB_PORT_ONE_LOCAL
  },
  {
    id: 4,
    name: 'Local QA',
    host: process.env.DB_HOST_TWO_LOCAL,
    user: process.env.DB_USER_TWO_LOCAL,
    password: process.env.DB_PASSWORD_TWO_LOCAL,
    database: process.env.DB_NAME_TWO_LOCAL,
    port: process.env.DB_PORT_TWO_LOCAL
  }
];

async function selectDatabase(role) {
  console.log(`\nSelect ${role} database:`);
  databaseOptions.forEach(db => {
    console.log(`${db.id}. ${db.name} - ${db.host} (${db.user}@${db.database})`);
  });

  const choice = await readline(`Enter your choice (1-${databaseOptions.length}): `);
  const selectedId = parseInt(choice);
  
  if (isNaN(selectedId) || selectedId < 1 || selectedId > databaseOptions.length) {
    console.error('Invalid selection. try Another one.');
    return selectDatabase(role);
  }

  return databaseOptions[selectedId - 1];
}

const selectedTables = argv.st ? argv.st.split(' ').filter(table => table.trim() !== '') : null;

let tableList = [];
if (selectedTables) {
  tableList = selectedTables;
} else {
  tableList = allTables.split(' ').filter(table => table.trim() !== '');
}

// Create the output folder if it doesn't exist (only needed for dumping)
if (!fs.existsSync(outputFolder) && argv.io) {
  fs.mkdirSync(outputFolder);
}

const processingTimes = {};

async function dumpTable(tableName,sourceDB) {
  const startTime = Date.now();
  const outputFile = path.join(outputFolder, `${tableName}.sql`);
  const command = `mysqldump -h ${sourceDB.host} -u "${sourceDB.user}" -p"${sourceDB.password}" "${sourceDB.database}" ${tableName} > ${outputFile}`;

  return new Promise((resolve, reject) => {
    console.log(`Dumping table: ${tableName} to ${outputFile}`);
    exec(command, (error, stdout, stderr) => {
      const endTime = Date.now();
      const timeTakenSec = (endTime - startTime) / 1000;
      processingTimes[tableName] = processingTimes[tableName] || {};
      processingTimes[tableName].dumpTime = timeTakenSec.toFixed(2);

      if (error) {
        console.error(`Error dumping table ${tableName}: ${error}`);
        reject(error);
        return;
      }
      if (stderr && !stderr.toLowerCase().includes('warning')) {
        console.error(`Stderr from mysqldump for ${tableName}: ${stderr}`);
      }
      console.log(`Successfully dumped table: ${tableName} (${processingTimes[tableName].dumpTime} sec)\n`);
      resolve(outputFile);
    });
  });
}

async function importTable(filePath, tableName,destDB) {
  const startTime = Date.now();
  const importCommand = `mysql -u ${destDB.user} -p"${destDB.password}" ${destDB.database} < ${filePath}`;
  console.log(`Importing table ${tableName} from ${filePath}`);
  return new Promise((resolve, reject) => {
    exec(importCommand, (error, stdout, stderr) => {
      const endTime = Date.now();
      const timeTakenSec = (endTime - startTime) / 1000;
      processingTimes[tableName] = processingTimes[tableName] || {};
      processingTimes[tableName].importTime = timeTakenSec.toFixed(2);

      if (error) {
        console.error(`Error importing table ${tableName} from ${filePath}: ${error}`);
        reject(error);
        return;
      }
      if (stderr && !stderr.toLowerCase().includes('warning')) {
            console.error(`Stderr from mysql import for ${tableName}: ${stderr}`);
      }
      console.log(`Successfully imported table: ${tableName} (${processingTimes[tableName].importTime} sec)\n`);
      resolve();
    });
  });
}

async function processTables(sourceDB,destDB) {
  const failedList = [];
  for (const table of tableList) {
    try {
      if (argv.do) {
        await dumpTable(table,sourceDB);
      } else if (argv.io) {
        const filePath = path.join(outputFolder, `${table}.sql`);
        if (fs.existsSync(filePath)) {
          await importTable(filePath, table,destDB);
        } else {
          console.warn(`SQL file not found for table ${table} at ${filePath}. Skipping.`);
        }
      } else {
        // both import and export
        const dumpedFilePath = await dumpTable(table,sourceDB);
        await importTable(dumpedFilePath, table, destDB);
      }
    } catch (error) {
      console.error(`Failed to process table ${table}. Error: ${table}.`);
      failedList.push(table);
    }
  }

  console.log('\n--- Processing Times ---');
  console.log('        tablename             |         dump Time       |      import time        ');
  console.log('------------------------------|-------------------------|-------------------------');
  for (const tableName of Object.keys(processingTimes)) {
    const dumpTime = processingTimes[tableName].dumpTime || '-';
    const importTime = processingTimes[tableName].importTime || '-';
    console.log(`${tableName.padEnd(30)}| ${dumpTime.padEnd(23)} | ${importTime.padEnd(30)}`);
  }

  if (argv.do) {
    console.log('Dumping of selected tables completed.');
  } else if (argv.io) {
    console.log('Import of selected tables completed.');
  } else {
    console.log('Dumping and importing of selected tables completed.');
  }
  if (failedList.length > 0){
    console.log("Failed list"+ failedList.join(", "));
    console.log(`RUN this to retry: node index.js -st "${failedList.join(' ')}"`);
  }
}


const main = async () => {
  let sourceDB,destDB;
  if (argv.db) {
    // Interactive database selection
    sourceDB = await selectDatabase('source');
    destDB = await selectDatabase('destination');
    if (sourceDB == destDB){
      console.error("Source and Destination DB cannot be same");
    }
  }else{
    sourceDB = databaseOptions[0]; // first one qa prod_health_company1 
    destDB = databaseOptions[2]; // third on locaal prod_deathl_company1
  }
  if (!argv.do && !argv.io){
    console.log(selectedTables);
    const answer = await readline("import and export all selected tables (y/n): ")
    if (answer.toLowerCase() != 'y'){
      process.exit()
    }
  }
  await processTables(sourceDB,destDB);
  process.exit()
  
}

main();


