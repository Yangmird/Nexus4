import mysql from 'mysql2';
const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "1234",
        database: "portfolio_manager"})
        connection.connect((err) => {
        if (err) {
            console.error('Databse connection failed:', err);
            return;
        }
        console.log('Database connected successfully');
        });

export default connection;