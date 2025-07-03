import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createInterface } from 'readline/promises';
import 'dotenv/config'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readline = async (message) => {
  const line = await rl.question(message)
  rl.close();
  return line;
};


const args = process.argv.slice(2);



const host = process.env.DB_HOST_ONE;
const user = process.env.DB_USER_ONE;
const password = process.env.DB_PASSWORD_ONE;
const database = process.env.DB_NAME_ONE;

const database_local = process.env.DB_NAME_ONE_LOCAL

const allTables = "agent_info backup_signature bundled_plans carrier_info cust_addresses dependent_policies dependents elevatedv_backup_new gid_assoc_fee group_census group_census_report group_info group_plans group_select_policy group_select_rule iha_admin_plan_selection iha_email_answers iha_email_questionnaires iha_files_generated_users iha_pdf_history_infos iha_policies_predictions med_medications new_assoc_fee payment_eft plan_policies plan_policies_member plan_pricing plan_tier plans policies policy_updates rep_assoc_fee rep_assoc_fee_waive signatures tier_updates user_activity_details userinfo annual_income";
const outputFolder = 'tables';

const allowedFlags = ['--dump-only', '--import-only', '--select-table'];


for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--') && !allowedFlags.includes(arg)) {
        console.error(`Error: Unknown argument "${arg}". Only ${allowedFlags.join(', ')} are allowed.`);
        process.exit(1);
    }

    if (arg === '--select-table' && args[i + 1]) {
        i++;
    }
}

const dumpOnlyFlag = args.includes('--dump-only');
const importOnlyFlag = args.includes('--import-only');
const selectTableArgIndex = args.indexOf('--select-table');
const selectedTablesString = selectTableArgIndex !== -1 && args[selectTableArgIndex + 1];
const selectedTables = selectedTablesString ? selectedTablesString.split(' ').filter(table => table.trim() !== '') : null;

let tableList = [];
if (selectedTables) {
  tableList = selectedTables;
} else {
  tableList = allTables.split(' ').filter(table => table.trim() !== '');
}

// Create the output folder if it doesn't exist (only needed for dumping)
if (!fs.existsSync(outputFolder) && !importOnlyFlag) {
  fs.mkdirSync(outputFolder);
}

const processingTimes = {};

async function dumpTable(tableName) {
  const startTime = Date.now();
  const outputFile = path.join(outputFolder, `${tableName}.sql`);
  const command = `mysqldump -h ${host} -u "${user}" -p"${password}" "${database}" ${tableName} > ${outputFile}`;

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

async function importTable(filePath, tableName) {
  const startTime = Date.now();
  const importCommand = `mysql -u root -p"Password@123" ${database_local} < ${filePath}`;
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

async function processTables() {
  for (const table of tableList) {
    try {
      if (dumpOnlyFlag) {
        await dumpTable(table);
      } else if (importOnlyFlag) {
        const filePath = path.join(outputFolder, `${table}.sql`);
        if (fs.existsSync(filePath)) {
          await importTable(filePath, table);
        } else {
          console.warn(`SQL file not found for table ${table} at ${filePath}. Skipping.`);
        }
      } else {
        const dumpedFilePath = await dumpTable(table);
        await importTable(dumpedFilePath, table);
      }
    } catch (error) {
      console.error(`Failed to process table ${table}. Exiting.`);
      process.exit(1);
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

  if (dumpOnlyFlag) {
    console.log('Dumping of selected tables completed.');
  } else if (importOnlyFlag) {
    console.log('Import of selected tables completed.');
  } else {
    console.log('Dumping and importing of selected tables completed.');
  }
}


const main = async () => {
  if (args.length == 0){
    const answer = await readline("import and export (y/n): ")
    if (answer.toLowerCase() != 'y'){
      process.exit()
    }
  }
  await processTables();
  process.exit()
  
}

main();


