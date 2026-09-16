import { useState } from 'react';
import { toast } from 'sonner';
import { REPORT_REASONS } from '../../constants/content';
import { useCreateReportMutation } from '../../features/posts/postsApi';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../common/Button';
import { Dialog } from '../common/Dialog';
import { TextareaField } from '../common/Field';

const TARGET_LABELS = { Post: 'post', Comment: 'comment', User: 'member' };

export default function ReportDialog({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [createReport, { isLoading }] = useCreateReportMutation();

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createReport({ targetType, targetId, reason, details }).unwrap();
      toast.success('Thanks for reporting. Our moderators will review it.');
      setDetails('');
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Report this ${TARGET_LABELS[targetType]}`}
      description="Reports are confidential. Tell us what's wrong so moderators can act quickly."
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Reason</legend>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm has-checked:border-brand-500 has-checked:bg-brand-50 dark:has-checked:bg-brand-500/10"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="accent-brand-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <TextareaField
          id="report-details"
          label="Additional details (optional)"
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Links, context or anything else moderators should know"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={isLoading}>
            Submit report
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
