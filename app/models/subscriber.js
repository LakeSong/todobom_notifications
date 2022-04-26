import { config } from "dotenv";

config();

import createSubscriber from "pg-listen";
import {
    cancelJob,
    createNewJob,
    getJobByName,
} from "../services/jobService.js";
import { getJobByTaskId, getTaskById } from "./worker.js";

const subscriber = createSubscriber({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

const verifyDate = async (task, callback) => {
    const dateLimit = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const taskDate = new Date(task.due_date);
    if(taskDate < dateLimit){
        const rawTaskDetails = await getTaskById(task.id);
        callback(rawTaskDetails.rows[0]);
    }
}

const handleEvent = {
    'INSERT': async (task) => {
        await verifyDate(task, (taskDetails) => {
            if(!taskDetails.user_id) {
                createNewJob(taskDetails);
            }
        })
    },
    'UPDATE': async (task) => {
        await verifyDate(task, (taskDetails) => {
            const job = await getJobByTaskId(taskDetails.id);
            job && (await cancelJob(job));
            if (!taskDetails.done && !taskDetails.user_id) {
                createNewJob(taskDetails);
            }
        })
    },
    'DELETE': async (task) => {
        const job = await getJobByTaskId(task.id);
        job && (await cancelJob(job));
    }
}

subscriber.notifications.on("tasks_watcher", async (payload) => {
    const {operation, task} = payload;
    await handleEvent[operation](task);
    // if (payload.operation === "INSERT") {
    //     createNewJob(payload.task);
    // } else if (payload.operation === "UPDATE") {
    //     const job = await getJobByName(payload.task.id);
    //     if (!job) {
    //         createNewJob(payload.task);
    //     } else {
    //         await cancelJob(job);
    //         createNewJob(payload.task);
    //     }
    // } else if (payload.operation === "DELETE") {
    //     const job = await getJobByName(payload.task.id);
    //     job && (await cancelJob(job));
    // }
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
}

export async function sendSampleMessage() {
    await subscriber.notify("tasks_watcher", {
        greeting: "Hey, buddy.",
        timestamp: Date.now(),
    });
}
