export class InsufficientInventoryError extends Error {
  tierId: number;

  constructor(tierId: number) {
    super('INSUFFICIENT_INVENTORY');
    this.tierId = tierId;
  }
}
