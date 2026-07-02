export default function useAppStripe() {
  const unavailable = async () => ({
    error: {
      message: 'Card payments are available on the mobile app only. Please use online transfer or cash on delivery on web.',
    },
  });

  return {
    initPaymentSheet: unavailable,
    presentPaymentSheet: unavailable,
  };
}
