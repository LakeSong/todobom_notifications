import { config } from "dotenv";

config();

import { connect } from "./models/subscriber.js";
import {
  cancelJob,
  deleteOldJobsDaily,
  getScheduledJobs,
  initializeJobs,
  scheduleMainDailyJob,
} from "./services/jobService.js";

import express from "express";
import cors from "cors";
const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  const scheduledJobs = getScheduledJobs();
  const jobsForDisplay = Object.entries(scheduledJobs).map(([id, job]) => ({
    [id]: {
      runsAt: new Date(job.nextInvocation()),
      pending: [
        job.pendingInvocations.map(item => ({
          endDate: new Date(item.endDate),
          rule: item.recurrenceRule.stringify && item.recurrenceRule?.stringify(),
        }))
      ]
    }
  }))
  res.json(jobsForDisplay);
});

app.delete("/:id", async (req, res) => {
  const id = req.params.id;
  id !== "undefined" && (await cancelJob(`${id}`));
  res.sendStatus(200);
});

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await connect();
  // await initializeJobs();
  // scheduleMainDailyJob();
  deleteOldJobsDaily();
});
