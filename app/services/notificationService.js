import { Expo } from "expo-server-sdk";
import pkg from "lodash";
const { omit } = pkg;

let expo = new Expo();

const getMessageByUrgency = (data, pushToken) => {
  let message = {
    to: pushToken,
    sound: "default",
    body: `${data?.title} is still waiting for you`.trim(),
    data: omit(data, "notification_tokens"),
  };
  const header = `Hey ${data?.display_name}, don't forget!`;
  if (data?.urgent) {
    message = {
      ...message,
      title: "ATTENTION PLEASE",
      subtitle: header,
    };
  } else {
    message = {
      ...message,
      title: header,
    };
  }
  return message;
};

export const sendNotification = async (data) => {
  let messages = [];
  data.notification_tokens?.forEach((pushToken, index) => {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
    }
    const message = getMessageByUrgency(data, pushToken);
    messages.push(message);
  });

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (e) {
        console.error(e);
      }
    }
  })();
};

const getAssignMessage = (data, pushToken) => ({
  to: pushToken,
  sound: "default",
  title: `Hey ${data?.display_name}, a new task has arrived!`.trim(),
  body: `You've just been assigned to ${data?.title}. Get right on it!`.trim(),
  data: omit(data, "notification_tokens"),
});

export const notifyUserOnTaskAssign = async (data) => {
  let messages = [];
  data.notification_tokens?.forEach((pushToken, index) => {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
    }
    const message = getAssignMessage(data, pushToken);
    messages.push(message);
  });

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (e) {
        console.error(e);
      }
    }
  })();
};
