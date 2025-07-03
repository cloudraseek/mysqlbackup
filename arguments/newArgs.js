import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('to', {
    alias: 't',
    describe: 'send it to where (1,2,3,4,5)',
    type: 'number',
    demandOption: true,
  })
  .option('policyId', {
    alias: 'p',
    describe: 'The ID of the policy',
    type: 'number',
    demandOption: true,
  })
  .argv;

const peffective_date = '2024-10-01';

  const mapper = {
    1: {
        ihaStatus: 'PENDING-UNDERWRITING',
        // code: 'IHAFILEREV',
        code: null,
        pstatus:'1',
        status:'ACTIVE',
        Approval:null,
        peffective_date:peffective_date,
        pterm_date: null
      },
    2: {
        ihaStatus: 'PENDING-SIGNATURE',
        code: 'IHAAPPROVE',
        pstatus:'1',
        status:'ACTIVE',
        Approval:null,
        peffective_date:peffective_date,
        pterm_date: null
      },
    3: {
        ihaStatus: 'RENEWAL-SIGNATURE-RECEIVED-READY-TO-ACTIVATE',
        code: 'MEMAPP',
        pstatus:"1",
        status:'ACTIVE',
        Approval:'1',
        peffective_date:peffective_date,
        pterm_date: null
      },
    5: {
      ihaStatus: 'ACTIVE',
      code:'tcr',
      pstatus:'2',
      status:'TERMED',
      Approval:'1'
    }
    // 5: 'TERMED'
  };
const to = mapper[argv.to];
if (!to){
  console.log("Invalid Argument -t pick (1,2,3,4,5)")
  process.exit(0)
}

const policy = argv.policyId;

export {to,policy};

// SELECT
//     vdmi.iha_dashboard_status,
//     pu.elgb_id,
//     pu.elgb_act,
//     pp.peffective_date,
//     p.status,
//     p.Approval,
//     pp.pstatus,
//     p.status AS policy_status
//   FROM vw_iha_dashboard_member_info AS vdmi
//   JOIN policy_updates AS pu ON vdmi.policy_id = pu.elgb_policyid
//   JOIN plan_policies AS pp ON vdmi.policy_id = pp.policy_num  -- Corrected join condition
//   JOIN policies AS p ON vdmi.policy_id = p.policy_id
//   WHERE vdmi.policy_id = 9954686
//   AND pu.elgb_id IN (
//     SELECT MAX(pu2.elgb_id)
//     FROM policy_updates AS pu2
//     WHERE pu2.elgb_policyid = vdmi.policy_id
//     GROUP BY pu2.elgb_policyid
//   )
