export const simulatePayment = async (shouldFail: boolean) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return { success: !shouldFail };
};
