import 'dotenv/config';
import { connectDB,sequelize } from "./config/dbConfig.js";
import yargs from 'yargs';
import { Sequelize } from 'sequelize';
import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('mode', {
    alias: 'm',
    describe: 'Revert mode',
    choices: ['new', 'renewal'],
    demandOption: true,
  })
  .help()
  .argv;

const mode = argv.mode;
let args;

try {
  args = await import(`./arguments/${mode}Args.js`);
} catch (err) {
  console.error(`Failed to load ./arguments/${mode}Args.js`);
  process.exit(1);
}

const { to, policy, host, p_ai } = args;

process.env.NODE_ENV = host;

await connectDB();



const checkPolicyUpdates = async (to,policy, options = {}) => {
  const [res] = await sequelize.query(
    'SELECT elgb_act,elgb_id FROM policy_updates WHERE elgb_id IN (SELECT MAX(pu.elgb_id) FROM policy_updates pu WHERE elgb_policyid = :policyId GROUP BY elgb_policyid)',
    {
      replacements: { policyId: policy },
      type: Sequelize.QueryTypes.SELECT,
      ...options
    }
  );
  if (!res){
    console.log('policyId does not exists in policy_updates table')
    process.exit(1)
  }
  if (res.elgb_act == to.code){
    console.log(res)
    console.log(`Already in ${to.ihaStatus}`)
    process.exit()
  }

  const [_,rowsEffected] = await sequelize.query(
    'UPDATE policy_updates SET elgb_act = :elgbAct WHERE elgb_id = :elgbId',
    {
      replacements: { elgbAct: to.code, elgbId: res.elgb_id },
      type: Sequelize.QueryTypes.UPDATE,
      ...options
    }
  );
  if (rowsEffected == 1){
    console.log(`policy moved to ${to.ihaStatus}`)
    return res;
  }else{
    console.log('failed to move policy')
    process.exit()
  }

}

const pae = (msg) => {
  console.log(chalk.bold.red(msg));
  process.exit(1);
}

const colorize = (color,msg) => {
  console.log(chalk.bold[color](msg));
}

const updatePlanPolicies = async (to,policy,p_ai, options={}) => {
  // check if p_ai is provided
  const [p_aiDetails] = await sequelize.query(
    'SELECT MAX(p_ai) AS max_p_ai, count(*) as plan_policy_count FROM plan_policies WHERE policy_num = :policyId',
    {
      replacements: { policyId: policy },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  if (p_aiDetails.plan_policy_count == 0){
    pae(`[-] No plan_policies record for ${policy}`);
  }

  const selectedPai = (p_aiDetails.plan_policy_count > 1) ? p_ai : p_aiDetails.max_p_ai;
  if (!selectedPai){
    pae(`[-] Invalid p_ai , selectedPai = ${selectedPai}, p_ai: ${p_ai}`);
  }

  const [_,rowsEffected] = await sequelize.query(
    `UPDATE plan_policies SET pstatus = ${to.pstatus},pterm_date = ${to.pterm_date}, peffective_date = ${to.peffective_date} where p_ai = ${selectedPai}`,
    {
      ...options
    }
  );
  colorize('green',`[+] plan_policies updates: ${rowsEffected.info}`);
}

const updatePolicies = async (to,policy, options) => {
  try{

    const [_,rowsEffected] = await sequelize.query(
      `UPDATE policies SET status = '${to.status}',term_date = ${to.term_date} ,approval = ${to.Approval} WHERE policy_id = ${policy}`,
      {
        type: Sequelize.QueryTypes.UPDATE,
        ...options
      }
    );
    colorize('green',`[+] policies updates: ${rowsEffected}`);

  }catch(e){
    console.log(e);
  }
    
}

const verify = async (policy, p_ai) => {
  let query = `
    SELECT iha_dashboard_status 
    FROM vw_iha_dashboard_member_info 
    WHERE policy_id = :policyId
  `;
  
  const replacements = { policyId: policy };

  if (p_ai) {
    query += ' AND p_ai = :p_ai';
    replacements.p_ai = p_ai;
  }

  const [rows] = await sequelize.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  console.log(rows);
};

const main = async () => {
  const transaction = await sequelize.transaction();
  try{
    const options = {transaction};
    const policyUpdate = await checkPolicyUpdates(to,policy, options);
    await Promise.all([updatePlanPolicies(to,policy,p_ai, options),updatePolicies(to,policy, options)]);
    await transaction.commit();
    colorize('green',"\n\n[+] DONE\n\n");
    
    await verify(policy,p_ai);
    process.exit(0)
  }catch(err){
    await transaction.rollback();
    colorize('red',`[-] Update Failed : ${err}`);
    process.exit(1);
  }
}

main()
