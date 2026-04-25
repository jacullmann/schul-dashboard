import { ref, readonly } from 'vue';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/modules/chat/composables/useAuth'; // Adjust path if needed

export function useReports() {
  const { user } = useAuth();

  const isSubmitting = ref(false);
  const reportError = ref<string | null>(null);
  const reportSuccess = ref(false);

  /**
   * Submits a report against another user.
   * @param reportedId The auth ID of the user being reported.
   * @param messageId The ID of the specific message (optional, in case of general report).
   * @param messageContentSnapshot The exact text of the message at the time of reporting.
   * @param reason The reason for the report (e.g., 'spam', 'harassment', 'inappropriate').
   */
  const submitReport = async (
    reportedId: string,
    messageId: string | null,
    messageContentSnapshot: string,
    reason: string,
  ): Promise<boolean> => {
    if (!user.value) {
      reportError.value = 'You must be authenticated to submit a report.';
      return false;
    }

    if (!reportedId || !reason || !messageContentSnapshot) {
      reportError.value = 'Missing required report fields.';
      return false;
    }

    isSubmitting.value = true;
    reportError.value = null;
    reportSuccess.value = false;

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.value.id,
        reported_id: reportedId,
        message_id: messageId,
        message_content_snapshot: messageContentSnapshot,
        reason: reason,
        status: 'pending', // Defaults to pending, but explicitly declaring is good practice
      });

      if (error) throw error;

      reportSuccess.value = true;
      return true;
    } catch (err: any) {
      if (err.code === '23505') {
        reportError.value = 'already_reported';
        return false;
      }
      reportError.value =
        err.message || 'An error occurred while submitting the report.';
      console.error('Report Error:', err);
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  /**
   * Resets the report state, useful for closing a report modal
   * and ensuring it's clean the next time it opens.
   */
  const resetReportState = () => {
    isSubmitting.value = false;
    reportError.value = null;
    reportSuccess.value = false;
  };

  return {
    isSubmitting,
    error: reportError,
    success: reportSuccess,
    submitReport,
    resetReportState,
  };
}
