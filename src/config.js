try {
  process.loadEnvFile();
} catch (err) {
  // Ignore the error and asume the environment variables are set.
}

const {
  BOT_TOKEN,
  CLIENT_ID,
  FAUCET_COOL_DOWN = "3600", // 1 hour
  GUILD_ID,
  LOG_CHANNEL_ID,
  MAX_UTXO_COUNT = "20",
  PRIVATE_KEY,
  SATS_AMOUNT = "100000", // 0.001 BTC
} = process.env;

export const botToken = BOT_TOKEN;
export const clientId = /** @type string */ (CLIENT_ID);
export const faucetCoolDown = Number.parseInt(FAUCET_COOL_DOWN);
export const guildId = /** @type string */ (GUILD_ID);
export const logChannelId = LOG_CHANNEL_ID;
export const maxUtxoCount = Number.parseInt(MAX_UTXO_COUNT);
export const privateKey = PRIVATE_KEY;
export const satsAmount = Number.parseInt(SATS_AMOUNT);
