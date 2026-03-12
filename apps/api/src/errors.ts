export class InsufficientInventoryError extends Error {
  tierId: number;

  constructor(tierId: number) {
    super('INSUFFICIENT_INVENTORY');
    this.tierId = tierId;
  }
}

export class SeatUnavailableError extends Error {
  seatIds: number[];

  constructor(seatIds: number[]) {
    super('SEAT_UNAVAILABLE');
    this.seatIds = seatIds;
  }
}
