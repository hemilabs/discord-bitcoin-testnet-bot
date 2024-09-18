import { ECPairFactory as ecPairFactory, networks } from "ecpair";
import * as bitcoinJs from "bitcoinjs-lib";
import * as secp256k1 from "tiny-secp256k1";
import pDoWhilst from "p-do-whilst";
import shuffle from "lodash/shuffle.js";

import { mempoolJS } from "./mempool.js";

const BASE_TX_SIZE = 10;
const FEE_FACTOR = 1.25;
const P2PKH_INPUT_SIZE = 148;
const P2PKH_OUTPUT_SIZE = 34;
const DUST_SATS = 546;

const { bitcoin } = mempoolJS();

async function getBalanceOfAddress(address) {
  const details = await bitcoin.addresses.getAddress({ address });
  return details.chain_stats.funded_txo_sum - details.chain_stats.spent_txo_sum;
}

function getAddressFromPublicKey(publicKey) {
  const payment = bitcoinJs.payments.p2pkh({
    network: bitcoinJs.networks.testnet,
    pubkey: publicKey,
  });
  return /** @type string */ (payment.address);
}

const sumValueOfUtxos = (utxos) =>
  utxos.reduce((total, utxo) => total + utxo.value, 0);

/**
 * Selects UTXOs from the set to cover the value and fee.
 *
 * UTXOs are selected sorting the list in ascending by value to pick the smaller
 * ones first, or are just selected at random.
 */
const utxoSelectionStrategies = {
  random: "random",
  smallerFirst: "smaller-first",
};
function selectUtxos(utxos, value, feeLevel, strategy) {
  let sorted;
  switch (strategy) {
    case utxoSelectionStrategies.smallerFirst:
      sorted = utxos.concat([]).sort((a, b) => a.value - b.value);
      break;
    case utxoSelectionStrategies.random:
      sorted = shuffle(utxos);
      break;
    default:
      throw new Error(`Invalid UTXO selection strategy: ${strategy}`);
  }
  const selected = [];
  let selectedValue;
  let requiredValue = value + (BASE_TX_SIZE + 2 * P2PKH_OUTPUT_SIZE) * feeLevel;
  let change;
  let i = 0;
  do {
    selected.push(sorted[i++]);
    selectedValue = sumValueOfUtxos(selected);
    requiredValue += P2PKH_INPUT_SIZE * feeLevel;
    change = selectedValue - requiredValue;
  } while (selectedValue < requiredValue && i < sorted.length);
  if (selectedValue < requiredValue) {
    throw new Error("Not enough balance");
  }

  return { change, selected };
}

async function tryCreateAndBroadcastTx(keyPair, address, value, strategy) {
  const fromAddress = getAddressFromPublicKey(keyPair.publicKey);
  const [utxos, { fastestFee }] = await Promise.all([
    bitcoin.addresses.getAddressTxsUtxo(fromAddress),
    bitcoin.fees.getFeesRecommended(),
  ]);
  const feeLevel = Math.ceil(fastestFee * FEE_FACTOR);
  const { selected, change } = selectUtxos(utxos, value, feeLevel, strategy);
  const psbt = new bitcoinJs.Psbt({ network: bitcoinJs.networks.testnet });
  psbt.addInputs(
    await Promise.all(
      selected.map(async function (utxo) {
        const txHex = await bitcoin.transactions.getTxHex(utxo);
        return {
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, "hex"),
        };
      }),
    ),
  );
  psbt.addOutput({ address, value });
  if (change > DUST_SATS) {
    psbt.addOutput({ address: fromAddress, value: change });
  }
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const txhex = psbt.extractTransaction().toHex();
  const txId = await bitcoin.transactions.postTx({ txhex });
  return txId;
}

/**
 * Creates and broadcasts a tx to send bitcoin to the recipient address.
 *
 * The broadcast may fail if i.e. an UTXO has too many unconfirmed ancestors.
 * For that reason and only in that case (the node returns the error code -26),
 * the operation is retried with different selection strategies.
 *
 * Selecting the smaller value UTXOs first helps reduce the risk of creating
 * dust but the cost may be higher until all those small transactions are spent.
 *
 * Selecting UTXOs at random reduces the risk of selecting the same UTXOs in
 * multiple concurrent operations, preventing the creation of long UTXO chains
 * that would cause the node to reject the tx.
 */
async function createAndBroadcastTx(keyPair, address, value) {
  const strategies = [
    utxoSelectionStrategies.random,
    utxoSelectionStrategies.random,
    utxoSelectionStrategies.random,
    utxoSelectionStrategies.random,
  ];
  let txId;
  await pDoWhilst(
    async function () {
      const strategy = strategies.shift();
      if (!strategy) {
        throw new Error("Could not obtain a valid UTXO set");
      }

      try {
        txId = await tryCreateAndBroadcastTx(keyPair, address, value, strategy);
      } catch (err) {
        if (
          err.code === -26 &&
          err.message.startsWith("too-long-mempool-chain")
        ) {
          return null;
        }

        throw err;
      }
    },
    () => !txId,
  );
  return txId;
}

function validateAddress(address) {
  try {
    bitcoinJs.address.toOutputScript(address, bitcoinJs.networks.testnet);
    return true;
  } catch (err) {
    return false;
  }
}

export function createBitcoinClient({ privateKey }) {
  const ecPair = ecPairFactory(secp256k1).fromPrivateKey(
    Buffer.from(privateKey, "hex"),
    { network: networks.testnet },
  );
  const clientAddress = getAddressFromPublicKey(ecPair.publicKey);
  return {
    getAddress: () => clientAddress,
    getBalance: () => getBalanceOfAddress(clientAddress),
    sendBitcoin: (address, value) =>
      createAndBroadcastTx(ecPair, address, value),
    validateAddress: (address) => validateAddress(address),
  };
}
