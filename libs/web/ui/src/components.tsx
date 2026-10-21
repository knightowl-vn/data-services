import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from "react";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("ko-button", `ko-button--${variant}`, size === "sm" && "ko-button--sm", className)}
      {...rest}
    />
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cx("ko-field", error && "ko-field--invalid")}>
      <label className="ko-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className="ko-field__error">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-msg`} className="ko-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

export type TextFieldProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        className={cx("ko-field__control", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        {...rest}
      />
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectFieldProps = FieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: readonly (string | SelectOption)[] };

export function SelectField({ label, hint, error, id, options, className, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <select id={fieldId} className={cx("ko-field__control", className)} {...rest}>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Stack({
  gap = 3,
  direction = "column",
  children,
}: {
  gap?: 1 | 2 | 3 | 4 | 5 | 6;
  direction?: "row" | "column";
  children: ReactNode;
}) {
  return (
    <div
      className={cx("ko-stack", direction === "row" && "ko-stack--row")}
      style={{ gap: `var(--ko-space-${gap})` }}
    >
      {children}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ko-card">
      {(title || actions) && (
        <div className="ko-card__header">
          {title && <h2 className="ko-card__title">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="ko-page-header">
      <div>
        <h1 className="ko-page-header__title">{title}</h1>
        {description && <p className="ko-page-header__description">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: Exclude<Tone, "neutral">;
  children: ReactNode;
}) {
  return (
    <div
      className={`ko-alert ko-alert--${tone}`}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ko-badge ko-badge--${tone}`}>{children}</span>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="ko-spinner" role="status" aria-label={label} />;
}
