export function isNewGuestUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NEW_GUEST_UI === '1';
}
