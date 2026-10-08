import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

const QR_CODE_OPTIONS = {
  width: 200,
  margin: 2,
  color: {
    dark: '#0F0F0F',
    light: '#FFFFFF',
  },
};

/** Renders `content` as a QR code data URL; `null` while empty or on failure. */
export function useQrCode(content: MaybeRefOrGetter<string | null>) {
  const qrCodeUrl = ref<string | null>(null);

  watch(
    () => toValue(content),
    async (value, _, onCleanup) => {
      let stale = false;
      onCleanup(() => {
        stale = true;
      });

      if (!value) {
        qrCodeUrl.value = null;
        return;
      }

      try {
        const { default: QRCode } = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(value, QR_CODE_OPTIONS);
        if (!stale) qrCodeUrl.value = dataUrl;
      } catch (err) {
        console.error('Failed to generate QR code', err);
        if (!stale) qrCodeUrl.value = null;
      }
    },
    { immediate: true },
  );

  return { qrCodeUrl };
}
