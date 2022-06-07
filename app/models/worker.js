import pkg from "pg";
const { Pool } = pkg;

import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5
});

const executeTransaction = async (callback) => {
  pool.query("BEGIN");
  const queryResult = await callback(pool);
  pool.query("COMMIT");
  return queryResult;
};

export const getAllTasks = async () => {
  return await pool.query(`SELECT tasks.*, user_tasks.* FROM tasks
        JOIN (
            select task_id, user_id, users.notification_tokens, users.display_name 
            from group_user_tasks 
            left join users
            on users.id = group_user_tasks.user_id
        ) AS user_tasks
        ON user_tasks.task_id = tasks.id
        WHERE tasks.due_date >= now() + interval '3h' AND tasks.due_date < current_date + interval '1d';`);
};

export const getTaskById = async (id) => {
  return await pool.query(
    `SELECT tasks.*, user_tasks.* FROM tasks
        JOIN (
            select task_id, user_id, owner_id, users.notification_tokens, users.display_name 
            from group_user_tasks 
            left join users
            on users.id = group_user_tasks.user_id
        ) AS user_tasks
        ON user_tasks.task_id = tasks.id
        WHERE tasks.id=$1;`,
    [id]
  );
};

export const createNewJob = async (task) => {
  return executeTransaction(async (client) => {
    return await client.query(
      `INSERT INTO notification_jobs (scheduled_time, task_id, target_user_id) VALUES ($1, $2, $3) RETURNING *`,
      [task.due_date, task.id, task.user_id]
    );
  });
};

export const getAllJobs = async () => {
  return await pool.query(
    `SELECT * FROM notification_jobs JOIN (
            SELECT task_id, user_id, users.display_name, users.notification_tokens
            FROM group_user_tasks 
            LEFT JOIN users
            ON users.id = group_user_tasks.user_id
        ) AS user_tasks ON user_tasks.task_id = notification_jobs.task_id`,
    []
  );
};

export const getDbJobByName = async (jobId) => {
  return await pool.query(`SELECT * FROM notification_jobs WHERE id=$1`, [
    jobId,
  ]);
};

export const getDbJobByTaskId = async (id) => {
  return await pool.query(
    `SELECT notification_jobs.*, display_name, notification_tokens 
      FROM notification_jobs 
      JOIN (
        SELECT group_user_tasks.task_id, display_name, notification_tokens 
        FROM group_user_tasks 
        LEFT JOIN users ON users.id = group_user_tasks.user_id) AS tasks_user
        ON tasks_user.task_id = notification_jobs.task_id WHERE notification_jobs.task_id=$1`,
    [id]
  );
};

export const deleteJobById = async (id) => {
  return executeTransaction(async (client) => {
    return await client.query(`DELETE FROM notification_jobs WHERE id=$1`, [
      id,
    ]);
  });
};

export const deleteOldJobs = async () => {
  return executeTransaction(async (client) => {
    return await client.query(
      "DELETE FROM notification_jobs WHERE scheduled_time < $1",
      [new Date(Date.now())]
    );
  });
};
