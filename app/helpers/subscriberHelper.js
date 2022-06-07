import { getTaskById, getDbJobByTaskId } from "../models/worker.js";
import { cancelJob, createNewJob } from "../services/jobService.js";
import { notifyUserOnTaskAssign } from "../services/notificationService.js";
import { generateDateLimit } from "./timeHelper.js";

const verifyDate = async (task, callback) => {
  const dateLimit = generateDateLimit();
  const taskDate = new Date(task.due_date);
  if (taskDate < dateLimit) {
    const rawTaskDetails = await getTaskById(task.id);
    callback(rawTaskDetails.rows[0]);
  }
};

export const handleDbEvent = {
  INSERT: async (task) => {
    await verifyDate(task, (taskDetails) => {
      if (taskDetails.user_id && taskDetails.user_id !== taskDetails.owner_id) {
        notifyUserOnTaskAssign(taskDetails);
        await createNewJob(taskDetails);
      }
    });
  },
  UPDATE: async (task) => {
    await verifyDate(task, async (taskDetails) => {
      let shouldNotify = false;
      const rawJob = await getDbJobByTaskId(taskDetails.id);
      rawJob?.rows.forEach(async (job) => {
        if (job?.target_user_id !== taskDetails?.user_id) {
          shouldNotify = true;
        }
        job && (await cancelJob(job.id));
      });
      if (!taskDetails.done && taskDetails.user_id) {
        await createNewJob(taskDetails);
        shouldNotify && notifyUserOnTaskAssign(taskDetails);
      }
    });
  },
  DELETE: async (task) => {
    const rawJob = await getDbJobByTaskId(task.id);
    rawJob?.rows.forEach(async (job) => {
      job && (await cancelJob(job.id));
    });
  },
};
