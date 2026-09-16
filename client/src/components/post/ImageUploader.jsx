import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { LIMITS } from '../../constants/content';
import { useUploadPostImageMutation } from '../../features/posts/postsApi';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../common/Button';
import { Spinner } from '../common/Feedback';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ImageUploader({ value = [], onChange, max = LIMITS.POST_MAX_IMAGES }) {
  const inputRef = useRef(null);
  const [pending, setPending] = useState(0);
  const [uploadImage] = useUploadPostImageMutation();
  const remaining = max - value.length - pending;

  const handleFiles = async (fileList) => {
    const files = [...fileList].slice(0, Math.max(0, remaining));
    const valid = files.filter((file) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name} is not a JPEG, PNG, WebP or GIF image`);
        return false;
      }
      if (file.size > LIMITS.MAX_IMAGE_BYTES) {
        toast.error(`${file.name} is larger than 5 MB`);
        return false;
      }
      return true;
    });

    setPending((count) => count + valid.length);
    const uploaded = [];
    for (const file of valid) {
      try {
        uploaded.push(await uploadImage(file).unwrap());
      } catch (error) {
        toast.error(getErrorMessage(error, `Could not upload ${file.name}`));
      } finally {
        setPending((count) => count - 1);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((image) => (
          <div key={image.publicId} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
            <img src={image.url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item.publicId !== image.publicId))}
              className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-950/70 text-white hover:bg-slate-950"
              aria-label="Remove image"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {Array.from({ length: pending }, (_, index) => (
          <div key={`pending-${index}`} className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line">
            <Spinner label="Uploading image" />
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        leftIcon={ImagePlus}
        className="mt-3"
        disabled={remaining <= 0}
        onClick={() => inputRef.current?.click()}
      >
        Add images
      </Button>
      <p className="mt-1.5 text-xs text-fg-subtle">Up to {max} images · JPEG, PNG, WebP or GIF · 5 MB each</p>
    </div>
  );
}
