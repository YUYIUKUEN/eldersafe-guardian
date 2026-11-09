type FieldErrorProps = {
  message?: string;
};

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm font-medium text-red-700" role="alert">
      {message}
    </p>
  );
}
