export const triggerHaptic = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(50); // Légère vibration de 50ms
    } catch {
      // Ignore errors if haptics are not supported or blocked
    }
  }
};
