import { scheduleJob, scheduledJobs, RecurrenceRule } from "node-schedule";
import {
  generateNotificationTime,
  getPriorDateByDays,
  getTimeDifferenceInDays,
} from "../helpers/timeHelper.js";
import {
  createNewJob as createNewDbJob,
  deleteJobById,
  deleteOldJobs,
  getAllJobs,
  getAllTasks,
  getDbJobByName,
  getDbJobByTaskId,
  getTaskById,
} from "../models/worker.js";
import {
  sendNotification,
  sendReminderNotification,
} from "./notificationService.js";

export const jobBuilder = async (task) => {
  let dbJob = await createNewDbJob(task);
  let jobDetails = dbJob.rows[0];
  scheduleNewJob(jobDetails.id, task);
};

export const getScheduledJobs = () => {
  return scheduledJobs;
};

export const createLongTermJobs = async (task, job = null) => {
  const jobDate = new Date(task.due_date);
  const timeDifferenceInDays = getTimeDifferenceInDays(jobDate, new Date());
  if (timeDifferenceInDays > 0) {
    let dbJob = job || (await createNewDbJob(task));
    let jobDetails = dbJob.rows[0];
    scheduleJobEveryHour(jobDetails.id, task);
    // schedule notification every hour
  }
  if (timeDifferenceInDays > 1) {
    let dbJob = job || (await createNewDbJob(task));
    let jobDetails = dbJob.rows[0];
    scheduleJobTwiceADay(jobDetails.id, task);
    // schedule notification twice a day
  }
  if (timeDifferenceInDays > 3) {
    let dbJob = job || (await createNewDbJob(task));
    let jobDetails = dbJob.rows[0];
    scheduleJobOnceADay(jobDetails.id, task);
    // schedule notification once a day
  }
  if (timeDifferenceInDays > 7) {
    let dbJob = job || (await createNewDbJob(task));
    let jobDetails = dbJob.rows[0];
    scheduleJobOnceAWeek(jobDetails.id, task);
    // schedule notification once a week
  }
};

export const createNewJob = async (task, job = null) => {
  let dbJob = job || (await createNewDbJob(task));
  let jobDetails = dbJob.rows[0];
  if (task.urgent) {
    scheduleUrgentJob(jobDetails.id, task);
  } else {
    scheduleRegularJob(jobDetails.id, task);
  }
  let onTimeDbJob = job || (await createNewDbJob(task));
  let snoozeJobDetails = onTimeDbJob.rows[0];
  if (task.snooze_interval) {
    scheduleSnoozedJob(snoozeJobDetails.id, task);
  } else {
    scheduleOnTimeJob(snoozeJobDetails.id, task);
  }
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

  scheduleJob(`${jobId}`, notificationTime, () => {
    sendNotification({ ...task, job_id: jobId }).then(() =>
      deleteJobById(jobId)
    );
  });
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

  console.log(`The job will run daily at ${date}`);
  scheduleJob("daily-job", rule, createJobsInTimeRange);
};

export const deleteOldJobsDaily = () => {
  scheduleJob("daily-cleanup", "0 0 * * *", deleteJobs); // running everyday at midnight
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
      createNewJob(task, job);
    }
  });
};

export const createJobsInTimeRange = async () => {
  console.log("Running main job...");
  const rawTasks = await getAllTasks();
  const allTasksInTimeRange = rawTasks.rows;
  allTasksInTimeRange?.forEach(async (task) => {
    if (task.user_id) {
      const rawJob = await getDbJobByTaskId(task.id);
      const job = rawJob?.rows[0];
      job && (await cancelJob(job.id));
      await createNewJob(task);
    }
  });
  console.log("Finished");
};

const deleteJobs = async () => {
  console.log("Started deletion");
  await deleteOldJobs();
  console.log("finished deletion");
};

const scheduleJobOnceADay = (jobId, task) => {
  const dueDate = new Date(task.due_date);
  const endTime = getPriorDateByDays(dueDate, 3);
  const startTime = getPriorDateByDays(endTime, 7);
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: "0 12 * * *" },
    () => {
      sendReminderNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};

const scheduleJobTwiceADay = (jobId, task) => {
  const dueDate = new Date(task.due_date);
  const endTime = getPriorDateByDays(dueDate, 1);
  const startTime = getPriorDateByDays(endTime, 3);
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: "00 12,18 * * *" },
    () => {
      sendReminderNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};

const scheduleJobEveryHour = (jobId, task) => {
  const endTime = new Date(task.due_date);
  const startTime = getPriorDateByDays(endTime, 1); // not sure when should start
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: "0 * * * *" },
    () => {
      sendReminderNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};

const scheduleJobOnceAWeek = (jobId, task) => {
  //actuallu runs every sunday and if we want 7 days back from now we can change the last * to something between 0 and 6
  const endTime = new Date(task.due_date);
  const startTime = new Date();
  const day = startTime.getDay();
  scheduleJob(
    `${jobId}`,
    { start: startTime, end: endTime, rule: `0 12 * * ${day}` },
    () => {
      sendReminderNotification({ ...task, job_id: jobId }).then(() =>
        deleteJobById(jobId)
      );
    }
  );
};
