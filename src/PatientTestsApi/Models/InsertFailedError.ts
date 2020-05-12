export class InsertFailedError extends Error {
  constructor(){
    super("Error inserting data record.");
  }
}