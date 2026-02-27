import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
    user: process.env.DBS_USER,
    password: process.env.DBS_PASSWORD,
    host: process.env.DBS_HOST,
    port: process.env.DBS_PORT,
    database: process.env.DBS_DATABASE,
    ssl: {
        rejectUnauthorized: false
    }
})