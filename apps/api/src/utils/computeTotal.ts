export type PricedItem = { quantity: number; unitPrice: number };

const computeTotal = (items: PricedItem[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

export default computeTotal;
