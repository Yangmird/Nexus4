import mysql from 'mysql2';
export function createAServer() {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "n3u3da!",
        database: "portfolio_manager"})
        connection.connect((err) => {
        if (err) {
            console.error('Databse connection failed:', err);
            return;
        }
        console.log('Database connected successfully');
        });
        return connection;
    }