const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  connectionTimeout: 60000,
  options: { encrypt: true, trustServerCertificate: false }
};

async function connectToDatabase(sql) {
  const pool = await sql.connect(sqlConfig);
  console.log("Connected to Azure SQL");
  return pool;
}

module.exports = { connectToDatabase };