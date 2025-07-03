import 'dotenv/config';
import { connectDB,sequelize } from "./config/dbConfig.js";
import {to,policy} from './arguments/newArgs.js';
import { Sequelize } from 'sequelize';


await connectDB();

const argv = process.argv

const checkPolicyUpdates = async (to,policy) => {
  const [res] = await sequelize.query(
    'SELECT elgb_act,elgb_id FROM policy_updates WHERE elgb_id IN (SELECT MAX(pu.elgb_id) FROM policy_updates pu WHERE elgb_policyid = :policyId GROUP BY elgb_policyid)',
    {
      replacements: { policyId: policy },
      type: Sequelize.QueryTypes.SELECT,
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

const updatePlanPolicies = async (to,policy) => {
  // const [_,rowsEffected] = await sequelize.query(
  //   'UPDATE plan_policies SET pstatus = :pstatus, peffective_date = :peffective_date WHERE policy_num = :policyId',
  //   {
  //     replacements: { pstatus: to.pstatus, policyId: policy, peffective_date: '2024-10-01' },
  //     type: Sequelize.QueryTypes.UPDATE,
  //   }
  // );
  const [_,rowsEffected] = await sequelize.query(
    'UPDATE plan_policies pp JOIN (SELECT MAX(p_ai) AS max_p_ai FROM plan_policies WHERE policy_num = :policyId) AS subquery ON pp.p_ai = subquery.max_p_ai SET pp.pstatus = :pstatus, pp.peffective_date = :peffective_date',
    {
      replacements: { pstatus: to.pstatus, policyId: policy, peffective_date: to.peffective_date },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );
  console.log(rowsEffected)
}

const updatePolicies = async (to,policy) => {
  const [_,rowsEffected] = await sequelize.query(
    'UPDATE policies SET status = :status, approval = :approval WHERE policy_id = :policyId',
    {
      replacements: { status: to.status, approval:to.Approval ,policyId: policy },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );
  console.log(to)
  console.log(rowsEffected)
    
}

const main = async () => {
  const policyUpdate = await checkPolicyUpdates(to,policy)
  // await updatePlanPolicies(to,policy)
  // await updatePolicies(to,policy)
  await Promise.all([updatePlanPolicies(to,policy),updatePolicies(to,policy)])
  console.log("[+] DONE")
  process.exit()
}

main()