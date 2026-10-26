/**
 * Daily limits only the app chooses (T-015). The database counts them (`bump_usage`, migration
 * 0015) but takes the number from the caller, so the numbers live here, in one place.
 */
export const AI_DAILY_LIMITS = {
  /** Task titles translated between Czech and English, per user. */
  taskTranslations: 200,
  /** Questions to the house manual and documents, per user. */
  manualQuestions: 30,
  /** Uploaded documents read by the AI to answer a question, per user. */
  documentReads: 40,
} as const;
