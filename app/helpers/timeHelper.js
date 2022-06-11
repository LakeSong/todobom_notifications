export const NOTIFICATION_TIME = 5 * 60 * 1000; //5 minutes;
export const TIME_RANGE = 40 * 24 * 60 * 60 * 1000; // 20 Days

export const generateNotificationTime = (due_date) => {
  return new Date(new Date(due_date) - NOTIFICATION_TIME);
};

export const generateDateLimit = () => {
  return new Date(Date.now() + TIME_RANGE);
};

export const getTimeDifferenceInDays = (date1, date2) => {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const getPriorDateByDays = (date, days) => {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
};
