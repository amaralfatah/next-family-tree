/**
 * An error that is safe to show to the user. `message` is a key in the `errors` message namespace
 * (messages/<locale>/errors.json), `values` its ICU arguments; the action layer translates it with the request's locale.
 */
export class UserError extends Error {
  constructor(
    message: string,
    readonly values?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "UserError";
  }
}
