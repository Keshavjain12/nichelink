import { cn } from '../../utils/misc';

const controlClass =
  'block w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg shadow-sm transition-colors ' +
  'placeholder:text-fg-subtle hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:focus:ring-rose-500/20';

export function Input({ className, ref, ...props }) {
  return <input ref={ref} className={cn(controlClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ref, ...props }) {
  return (
    <textarea
      ref={ref}
      className={cn(controlClass, 'min-h-24 py-2.5 leading-6', className)}
      {...props}
    />
  );
}

export function Select({ className, children, ref, ...props }) {
  return (
    <select ref={ref} className={cn(controlClass, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ htmlFor, children, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-fg', className)}>
      {children}
      {required && (
        <span className="ml-0.5 text-rose-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** Label + control + hint/error, wired with aria-describedby for screen readers. */
export function FormField({ id, label, error, hint, required, className, children }) {
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ id, label, error, hint, required, className, ...inputProps }) {
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      {(fieldProps) => <Input {...fieldProps} {...inputProps} />}
    </FormField>
  );
}

export function TextareaField({ id, label, error, hint, required, className, ...inputProps }) {
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      {(fieldProps) => <Textarea {...fieldProps} {...inputProps} />}
    </FormField>
  );
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
  ...selectProps
}) {
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      {(fieldProps) => (
        <Select {...fieldProps} {...selectProps}>
          {children}
        </Select>
      )}
    </FormField>
  );
}
