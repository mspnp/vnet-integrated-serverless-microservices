/**
 * Interface for retry policy
 */
export interface IRetryPolicy {
  retryAfterMilliSec: number;
  /**
   * Check if the operation should be retried
   */
  shouldRetry(): boolean;
}
