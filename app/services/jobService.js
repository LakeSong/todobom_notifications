import { scheduleJob, scheduledJobs, RecurrenceRule } from "node-schedule";
import {
    createNewJob as createNewDbJob,
    deleteJobById,
    getAllJobs,
    getAllTasks,
    getJobByTaskId,
    getTaskById,
} from "../models/worker.js";
import { sendNotification } from "./notificationService.js";

export const createNewJob = async (task) => {
    let dbJob = await createNewDbJob(task);
    let jobDetails = dbJob.rows[0];

    scheduleNewJob(jobDetails.id, task.due_date, task.notification_tokens);
};

export const scheduleNewJob = (jobId, task) => {
    scheduleJob(`${jobId}`, new Date(time), async () => {
        await sendNotification(tokens);
        await deleteJobById(jobId);
    });
};

export const scheduleMainDailyJob = () => {
    const date = new Date();
    const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const rule = new RecurrenceRule({
        hour: hours,
        minute: minutes,
        second: seconds + 5
    });
    
    console.log(`The job will run daily at ${date.getTime()}`);
    scheduleJob('daily-job', rule, createJobsInTimeRange);
};

export const getJobByName = async (taskId) => {
    const dbJob = await getJobByTaskId(taskId);
    const job = dbJob?.rows[0];
    return job ? scheduledJobs[job.id] : null;
};

export const cancelJob = async (job) => {
    await deleteJobById(job.name);
    job.cancel();
};

export const initializeJobs = async () => {
    const dbJobs = await getAllJobs();
    dbJobs?.rows?.forEach(async (job) => {
        const rawTask = await getTaskById(job.task_id);
        const task = rawTask.rows[0];
        await scheduleNewJob(
            job.id,
            task
        );
    });
};

export const createJobsInTimeRange = async () => {
    console.log('Running main job...')
    const rawTasks = await getAllTasks();
    const allTasksInTimeRange = rawTasks.rows;
    allTasksInTimeRange?.forEach(task => {
        if(!task.user_id) {
            const job = await getJobByTaskId(task.id);
            job && (await cancelJob(job));
            createNewJob(task);
        }
    })
}
