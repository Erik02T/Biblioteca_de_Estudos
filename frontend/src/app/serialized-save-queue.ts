export class SerializedSaveQueue<T> {
  private latestValue: T;
  private version = 0;
  private persistedVersion = 0;
  private pending?: Promise<void>;

  constructor(
    initialValue: T,
    private readonly persist: (value: T) => Promise<void>,
  ) {
    this.latestValue = initialValue;
  }

  update(value: T) {
    this.latestValue = value;
    this.version += 1;
  }

  async flush(): Promise<void> {
    while (this.persistedVersion < this.version) {
      await this.flushPending();
    }
  }

  private flushPending(): Promise<void> {
    if (this.pending) return this.pending;

    const pending = this.persistLatest().finally(() => {
      if (this.pending === pending) this.pending = undefined;
    });
    this.pending = pending;
    return pending;
  }

  private async persistLatest() {
    while (this.persistedVersion < this.version) {
      const version = this.version;
      await this.persist(this.latestValue);
      this.persistedVersion = version;
    }
  }
}
