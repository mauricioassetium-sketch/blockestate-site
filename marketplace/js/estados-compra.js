/**
 * The funnel of a purchase, in the buyer's words.
 *
 * One list for the whole buyer side: the purchase page draws the line of steps from here and the desk
 * reads the same words. It mirrors `src/domain/comprador.ts`, which is where the server decides the
 * position — if a state is ever renamed, both move together.
 */
export const PASOS = [
  { clave: 'held', humano: 'Reserved' },
  { clave: 'kyc_pending', humano: 'Identity check' },
  { clave: 'kyc_approved', humano: 'Identity approved' },
  { clave: 'quote_issued', humano: 'Quote issued' },
  { clave: 'deposit_pending', humano: 'Deposit pending' },
  { clave: 'deposit_detected', humano: 'Deposit detected' },
  { clave: 'deposit_confirmed', humano: 'Deposit confirmed' },
  { clave: 'payment_pending', humano: 'Balance pending' },
  { clave: 'detected', humano: 'Payment detected' },
  { clave: 'confirmed', humano: 'Payment confirmed' },
  { clave: 'aed_settlement_pending', humano: 'Settlement in dirhams' },
  { clave: 'settled', humano: 'Settled' },
  { clave: 'business_completion_approved', humano: 'Business completion signed' },
];
