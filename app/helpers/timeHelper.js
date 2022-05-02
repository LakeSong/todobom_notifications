export const NOTIFICATION_TIME = 5 * 60 * 1000; //5 minutes;
export const TIME_RANGE = 24 * 60 * 60 * 1000; // 24 hours

export const generateNotificationTime = (due_date) => {
  return new Date(new Date(due_date) - NOTIFICATION_TIME);
};

export const generateDateLimit = () => {
  return new Date(Date.now() + TIME_RANGE);
};
