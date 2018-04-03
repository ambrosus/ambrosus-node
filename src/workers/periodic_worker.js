export default class PeriodicWorker {
  constructor(interval) {
    this.interval = interval;
    this.timerId = null;
  }

  async start() {
    if (this.timerId !== null) {
      throw new Error('Already started');
    }

    await this.init();
    this.timerId = setInterval(() => {
      this.work().catch(console.error);
    }, this.interval);
  }

  async init() {
    
  }

  async work() {
    throw new Error('Abstract method work() needs to be overridden');
  }
}
