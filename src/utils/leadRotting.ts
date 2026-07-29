export const ROTTING_DAYS = {
  essential: 5, // Default
  pro: 3,
  enterprise: 1, // Custom per lead
};

export const isLeadRotting = (lastContactAt: any, threshold = 5) => {
  if (!lastContactAt) return false;
  // Handle Firestore Timestamp or number
  const millis = typeof lastContactAt === 'number' ? lastContactAt : lastContactAt.toMillis?.() || 0;
  if (!millis) return false;
  
  const daysDiff = Math.floor((Date.now() - millis) / (1000 * 60 * 60 * 24));
  return daysDiff > threshold;
};

export const getRottingDays = (lastContactAt: number) => {
  if (!lastContactAt) return 0;
  return Math.floor((Date.now() - lastContactAt) / (1000 * 60 * 60 * 24));
};
