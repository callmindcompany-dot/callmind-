/**
 * CallMind Local Mock Timestamp Adapter
 * 
 * Provides Firestore-compatible Timestamp features without Firebase SDK dependencies.
 */
export class MockTimestamp {
  constructor(private date: Date) {}

  toDate(): Date {
    return this.date;
  }

  toMillis(): number {
    return this.date.getTime();
  }

  static now(): MockTimestamp {
    return new MockTimestamp(new Date());
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(date);
  }

  static fromMillis(ms: number): MockTimestamp {
    return new MockTimestamp(new Date(ms));
  }
}

export const Timestamp = MockTimestamp;
