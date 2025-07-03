
import { Sequelize } from 'sequelize';

const nodeEnv = process.env.NODE_ENV || 'local';

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: nodeEnv !== 'local' ? process.env.DB_HOST_ONE : process.env.DB_HOST_ONE_LOCAL,
    username: nodeEnv !== 'local' ? process.env.DB_USER_ONE : process.env.DB_USER_ONE_LOCAL,
    password: nodeEnv !== 'local' ? process.env.DB_PASSWORD_ONE : process.env.DB_PASSWORD_ONE_LOCAL,
    database: nodeEnv !== 'local' ? process.env.DB_NAME_ONE : process.env.DB_NAME_ONE_LOCAL,
    port: nodeEnv !== 'local' ? process.env.DB_PORT_ONE : process.env.DB_PORT_ONE_LOCAL,
  });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Connection to the database has been established successfully. [${nodeEnv !== 'local' ? process.env.DB_HOST_ONE : process.env.DB_HOST_ONE_LOCAL}]`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1); // Exit the process if there's a connection error
  }
};

export { sequelize, connectDB };


