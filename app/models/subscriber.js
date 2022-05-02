import { config } from "dotenv";

config();

import createSubscriber from "pg-listen";
import { handleDbEvent } from "../helpers/subscriberHelper.js";

const subscriber = createSubscriber({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


subscriber.notifications.on("tasks_watcher", async (payload) => {
  const { operation, task } = payload;
  await handleDbEvent[operation](task);
});

subscriber.notifications.on("assignee_watcher", async (payload) => {
  const { operation, task } = payload;
  await handleDbEvent[operation](task);
});

subscriber.events.on("error", (error) => {
  console.error("Fatal database connection error:", error);
  process.exit(1);
});

subscriber.events.on("connected", (error) => {
  console.log("connected to db");
});

process.on("exit", () => {
  subscriber.close();
});

export async function connect() {
  await subscriber.connect();
  await subscriber.listenTo("tasks_watcher");
  await subscriber.listenTo("assignee_watcher");
}

export async function sendSampleMessage() {
  await subscriber.notify("tasks_watcher", {
    greeting: "Hey, buddy.",
    timestamp: Date.now(),
  });
}
