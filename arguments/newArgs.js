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
  .option('p_ai',{
    alias:'pai',
    describe:'p_ai, preferred in case of multiple record for proper identification',
    type:'number',
    default:null,
    demandOption:false
  })
  .option('host', {
    alias: 'h',
    describe: 'The host environment',
    type: 'string',
    default: 'local',
    choices: ['local', 'qa'], 
  })
  .argv;

const peffective_date = '2024-10-01';

  const mapper = {
    1: {
        ihaStatus: 'PENDING-UNDERWRITING',
        code: 'IHAFILEREV',
        pstatus:'1',
        status:'ACTIVE',
        Approval:null,
        peffective_date:peffective_date,
        pterm_date: null,
        term_date : null
      },
    2: {
        ihaStatus: 'PENDING-SIGNATURE',
        code: 'IHAAPPROVE',
        pstatus:'1',
        status:'ACTIVE',
        Approval:null,
        peffective_date:peffective_date,
        pterm_date: null,
        term_date:null
      },
    3: {
        ihaStatus: 'RENEWAL-SIGNATURE-RECEIVED-READY-TO-ACTIVATE',
        code: 'MEMAPP',
        pstatus:"1",
        status:'ACTIVE',
        Approval:'1',
        peffective_date:peffective_date,
        pterm_date: null,
        term_date: null
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
const p_ai = argv.pai;
const host = argv.host;

export {to,policy,host,p_ai};

