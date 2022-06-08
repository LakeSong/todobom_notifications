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
  res.json(Object.keys(getScheduledJobs()).length);
});

app.delete("/:id", async (req, res) => {
  const id = req.params.id;
  id && (await cancelJob(`${id}`));
  res.sendStatus(200);
});

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await connect();
  await initializeJobs();
  scheduleMainDailyJob();
  deleteOldJobsDaily();
});
