import 'dotenv/config';
import { connectDB,sequelize } from "./config/dbConfig.js";

await connectDB();

const main = async () => {
    const [res] = await sequelize.query('select * from files.users limit 1');
    console.log(res)
}

main()