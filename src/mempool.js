import fetch from "fetch-plus-plus";

const mempoolSpaceApiBaseUrl = "https://mempool.space/testnet/api/";

const fetchMempoolApi = (path, init) =>
  fetch(`${mempoolSpaceApiBaseUrl}${path}`, init);

/**
 * Tiny library to talk to the mempool.space API.
 *
 * It provides an API that matches the official `@mempool/mempool.js` package:
 * https://github.com/mempool/mempool.js
 */
export const mempoolJS = () => ({
  bitcoin: {
    addresses: {
      getAddress: ({ address }) => fetchMempoolApi(`address/${address}`),
      getAddressTxsUtxo: (address) =>
        fetchMempoolApi(`address/${address}/utxo`),
    },
    fees: {
      getFeesRecommended: () => fetchMempoolApi("v1/fees/recommended"),
    },
    transactions: {
      getTxHex: ({ txid }) => fetchMempoolApi(`tx/${txid}/hex`),
      postTx: ({ txhex }) =>
        fetchMempoolApi("tx", { body: txhex, method: "POST" }),
    },
  },
});
