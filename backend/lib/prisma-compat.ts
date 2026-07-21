export function isPrismaUnknownFieldError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Unknown field") ||
    message.includes("Unknown argument") ||
    message.includes("does not exist in the current database")
  );
}
