import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { createBitcoinClient } from "./bitcoin-client.js";
import {
  faucetCoolDown,
  logChannelId,
  privateKey,
  satsAmount,
} from "./config.js";

const satsToBtc = (sats) =>
  (sats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");

const shorten = (txId) => `${txId.slice(0, 4)}...${txId.slice(-4)}`;

const getExplorerTxLink = (txId) =>
  `[${shorten(txId)}](https://mempool.space/testnet/tx/${txId})`;

const getExplorerAddressLink = (address) =>
  `[${address}](https://mempool.space/testnet/address/${address})`;

const bitcoinClient = createBitcoinClient({ privateKey });

// Command "/tbtc-faucet-balance"
const faucetBalanceCommand = {
  coolDown: 5, // seconds
  data: new SlashCommandBuilder()
    .setName("tbtc-faucet-balance")
    .setDescription("Reports the testnet BTC balance of the faucet."),
  async execute(client, interaction) {
    await interaction.reply("Querying...");
    const balance = satsToBtc(await bitcoinClient.getBalance());
    await interaction.editReply(`I have ${balance} tBTC.`);
    return true;
  },
};

// Command "/tbtc-faucet"
const faucetCommand = {
  coolDown: faucetCoolDown,
  data: new SlashCommandBuilder()
    .setName("tbtc-faucet")
    .setDescription("Sends testnet BTC from the faucet to the given address.")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("The address to send the testnet BTC to.")
        .setRequired(true),
    ),
  async execute(client, interaction) {
    const balanceSats = await bitcoinClient.getBalance();
    if (balanceSats < satsAmount) {
      const address = bitcoinClient.getAddress();
      await interaction.reply({
        content:
          "I don't have enough tBTC." +
          ` Please send me some to ${getExplorerAddressLink(address)}!`,
        flags: MessageFlags.SuppressEmbeds,
      });
      return false;
    }

    const address = interaction.options.getString("address");
    if (!bitcoinClient.validateAddress(address)) {
      await interaction.reply({
        content: "Please provide a valid testnet bitcoin address.",
        ephemeral: true,
      });
      return false;
    }

    await interaction.reply("Sending...");
    const txId = await bitcoinClient.sendBitcoin(address, satsAmount);
    await interaction.editReply({
      content:
        `Sent ${satsToBtc(satsAmount)} tBTC` +
        ` to ${getExplorerAddressLink(address)}` +
        ` in transaction ${getExplorerTxLink(txId)}!`,
      flags: MessageFlags.SuppressEmbeds,
    });
    const logChannel = client.channels.cache.get(logChannelId);
    const { username } = interaction.user;
    await logChannel.send(
      `Sent ${satsToBtc(satsAmount)} tBTC to ${address} in ${txId}.` +
        ` Requested by ${username}.`,
    );
    return true;
  },
};

export const commandDefinitions = [faucetBalanceCommand, faucetCommand];
