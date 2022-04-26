import { Expo } from "expo-server-sdk";

let expo = new Expo();
let pushToken = "ExponentPushToken[l-dMUvPc9R39xPv8XJ4uuK]";

export const sendNotification = async (pushTokens) => {
    let messages = [];
    pushTokens?.forEach((pushToken, index) => {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(
                `Push token ${pushToken} is not a valid Expo push token`
            );
        }
        messages.push({
            to: pushToken,
            sound: "default",
            body: "This is a test notification",
            data: { withSome: "data" },
        });
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
