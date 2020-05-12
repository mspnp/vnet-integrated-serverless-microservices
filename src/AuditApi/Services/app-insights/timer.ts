/** Timer class to track times between downstream api calls */
export class Timer {
  private _startDate: number = 0;
  private _endDate: number = 0;

  /** Starts the timer */
  public constructor() {
    this.start();
  }

  /** Starts the Timer */
  public start(): void {
    this._startDate = Date.now();
    this._endDate = -1;
  }

  /** Stops the Timer */
  public stop(): void {
    this._endDate = Date.now();
  }

  /** Gets the duration of the timer */
  public get duration(): number { return this._endDate - this._startDate; }

  public get startDate(): Date { return new Date(this._startDate); }
  public get endDate(): Date { return new Date(this._endDate); }
}
