import { ECPairFactory as ecPairFactory, networks } from "ecpair";
import * as bitcoinJs from "bitcoinjs-lib";
import * as secp256k1 from "tiny-secp256k1";

import { mempoolJS } from "./mempool.js";

const BASE_TX_SIZE = 10;
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
 * Select UTXOs from the set to cover the value and fee.
 *
 * UTXOs are sorted ascending by value to pick the smaller ones first. This will
 * increase the cost of the initial transactions but will help reduce the
 * chances of creating dust outputs.
 */
async function selectUtxos(utxos, value, feeLevel) {
  utxos.sort((a, b) => a.value - b.value);
  const selected = [];
  let selectedValue;
  let requiredValue = value + (BASE_TX_SIZE + 2 * P2PKH_OUTPUT_SIZE) * feeLevel;
  let change;
  let i = 0;
  do {
    selected.push(utxos[i++]);
    selectedValue = sumValueOfUtxos(selected);
    requiredValue += P2PKH_INPUT_SIZE * feeLevel;
    change = selectedValue - requiredValue;
  } while (selectedValue < requiredValue && i < utxos.length);
  if (selectedValue < requiredValue) {
    throw new Error("Not enough balance");
  }

  return { change, selected };
}

async function createAndBroadcastTx(keyPair, address, value, changeAddress) {
  const fromAddress = getAddressFromPublicKey(keyPair.publicKey);
  const [utxos, { fastestFee }] = await Promise.all([
    bitcoin.addresses.getAddressTxsUtxo(fromAddress),
    bitcoin.fees.getFeesRecommended(),
  ]);
  const { selected, change } = await selectUtxos(utxos, value, fastestFee);
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
    psbt.addOutput({ address: changeAddress || fromAddress, value: change });
  }
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const txhex = psbt.extractTransaction().toHex();
  const txId = await bitcoin.transactions.postTx({ txhex });
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
