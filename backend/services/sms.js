/**
 * OTP delivery through the Renflair SMS gateway. Without RENFLAIR_API_KEY the
 * OTP is printed to the server log instead (development mode).
 */

const config = require('../config');
const { maskPhone } = require('../utils/crypto');

async function sendOtp(phone, otp) {
  if (!config.sms.renflairApiKey) {
    if (!config.isTest) console.log(`[sms:dev] OTP for ${maskPhone(phone)} → ${otp}`);
    return { delivered: false };
  }

  const url = new URL('https://sms.renflair.in/V1.php');
  url.searchParams.set('API', config.sms.renflairApiKey);
  url.searchParams.set('PHONE', phone);
  url.searchParams.set('OTP', otp);

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`SMS gateway responded with HTTP ${res.status}`);
  return { delivered: true };
}

module.exports = { sendOtp };
