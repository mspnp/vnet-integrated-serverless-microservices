export class UpdateFailedError extends Error {
  constructor(){
    super("Error updating data record.");
  }
}