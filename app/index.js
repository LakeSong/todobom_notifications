import { config } from "dotenv";

config();

import { connect } from "./models/subscriber.js";
import {
  cancelJob,
  getScheduledJobs,
  initializeJobs,
  scheduleMainDailyJob,
} from "./services/jobService.js";

import express from "express";
import cors from 'cors'
const app = express();
const port = 3000;

const corsOptions = {
  origin: function (origin, callback) {
      callback(null, true);
  },
  credentials: true,
}
app.use(cors(corsOptions))

app.get("/", (req, res) => {
  res.json(Object.keys(getScheduledJobs()).length);
});

app.delete("/:id",async (req, res) => {
   await cancelJob(`${req.params.id}`);
   res.sendStatus(200);
})

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await connect();
  await initializeJobs();
  scheduleMainDailyJob();
});
