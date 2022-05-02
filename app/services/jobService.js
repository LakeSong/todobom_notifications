import { scheduleJob, scheduledJobs, RecurrenceRule } from "node-schedule";
import { generateNotificationTime } from "../helpers/timeHelper.js";
import {
  createNewJob as createNewDbJob,
  deleteJobById,
  getAllJobs,
  getAllTasks,
  getDbJobByName,
  getDbJobByTaskId,
  getTaskById,
} from "../models/worker.js";
import { sendNotification } from "./notificationService.js";

export const jobBuilder = async (task) => {
  let dbJob = await createNewDbJob(task);
  let jobDetails = dbJob.rows[0];
  scheduleNewJob(jobDetails.id, task);
};

export const getScheduledJobs = () => {
  return scheduledJobs;
};

export const createNewJob = async (task) => {
  //if task is urgent
  //  create urgent task from 5 minutes before due date
  let dbJob = await createNewDbJob(task);
  let jobDetails = dbJob.rows[0];
  if (task.urgent) {
    scheduleUrgentJob(jobDetails.id, task);
  } else {
    scheduleRegularJob(jobDetails.id, task);
  }
  let onTimeDbJob = await createNewDbJob(task);
  let snoozeJobDetails = onTimeDbJob.rows[0];
  if (task.snooze_interval) {
    scheduleSnoozedJob(snoozeJobDetails.id, task);
  } else {
    scheduleOnTimeJob(onTimeDbJob.id, task);
  }

  //if regular task
  //  create task 5 minutes before

  //if task is snoozed
  //  create a recurrence rule to run every x minutes from the due date
};

export const scheduleUrgentJob = (jobId, task) => {
  const notificationTime = generateNotificationTime(task.due_date);
  const startTime = new Date(notificationTime);
  const endTime = new Date(startTime.getTime() + 60000);
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: "*/3 * * * * *" },
    () => {
      sendNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};
export const scheduleRegularJob = (jobId, task) => {
  const notificationTime = generateNotificationTime(task.due_date);
  scheduleJob(`${jobId}`, notificationTime, () => {
    sendNotification({ ...task, job_id: jobId }).then(() =>
      deleteJobById(jobId)
    );
  });
};
export const scheduleSnoozedJob = (jobId, task) => {
  const notificationTime = new Date(task.due_date);
  const snoozeInterval = task.snooze_interval;
  scheduleJob(
    `${jobId}`,
    { start: notificationTime, rule: `*/${snoozeInterval} * * * *` },
    () => {
      sendNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};
export const scheduleOnTimeJob = (jobId, task) => {
  const notificationTime = new Date(task.due_date);
  scheduleJob(`${jobId}`, notificationTime, () => {
    sendNotification({ ...task, job_id: jobId }).then(() =>
      deleteJobById(jobId)
    );
  });
};

export const scheduleNewJob = (jobId, task) => {
  const notificationTime = generateNotificationTime(task.due_date);
  const startTime = new Date(Date.now() + 5000);
  const endTime = new Date(startTime.getTime() + 20000);
  let rule;
  if (task.urgent) {
    rule = { start: startTime, end: endTime, rule: "*/3 * * * * *" };
  }

  //   scheduleJob(`${jobId}`, notificationTime, () => {
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: "*/3 * * * * *" },
    () => {
      sendNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};

export const scheduleMainDailyJob = () => {
  const date = new Date();
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const rule = new RecurrenceRule();
  rule.hour = hours;
  rule.minute = minutes;
  rule.second = seconds + 5;

  console.log(`The job will run daily at ${date.getTime()}`);
  scheduleJob("daily-job", rule, createJobsInTimeRange);
};

export const getJobByTaskId = async (taskId) => {
  const dbJob = await getDbJobByTaskId(taskId);
  const job = dbJob?.rows[0];
  return job ? scheduledJobs[job.id] : null;
};

export const cancelJob = async (jobId) => {
  await deleteJobById(jobId);
  const job = scheduledJobs[jobId];
  job && job.cancel();
};

export const initializeJobs = async () => {
  const dbJobs = await getAllJobs();
  dbJobs?.rows?.forEach(async (job) => {
    if (new Date(job.scheduled_time) > Date.now()) {
      const rawTask = await getTaskById(job.task_id);
      const task = rawTask.rows[0];
      await scheduleNewJob(job.id, task);
    }
  });
};

export const createJobsInTimeRange = async () => {
  console.log("Running main job...");
  const rawTasks = await getAllTasks();
  const allTasksInTimeRange = rawTasks.rows;
  allTasksInTimeRange?.forEach(async (task) => {
    if (!task.user_id) {
      const rawJob = await getDbJobByTaskId(task.id);
      const job = rawJob?.rows[0];
      job && (await cancelJob(job.id));
      await createNewJob(task);
    }
  });
  console.log("Finished");
};
