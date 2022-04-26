import { config } from "dotenv";

config();

import { connect } from "./models/subscriber.js";
import { initializeJobs, scheduleMainDailyJob } from "./services/jobService.js";

import express from "express";
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await connect();
  await initializeJobs();
  scheduleMainDailyJob();
});
