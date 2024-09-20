import fetch from "fetch-plus-plus";

/**
 * Tiny library to talk to Esplora-based APIs, like Blockstream and Mempool,
 * exposing an API similar to the official Mempool NPM package.
 *
 * See:
 * https://github.com/Blockstream/esplora/blob/master/API.md
 * https://github.com/mempool/mempool.js
 */
export const esploraJs = function ({ baseUrl }) {
  const fetchApi = (path, init) => fetch(`${baseUrl}${path}`, init);

  return {
    bitcoin: {
      addresses: {
        getAddress: ({ address }) => fetchApi(`address/${address}`),
        getAddressTxsUtxo: (address) => fetchApi(`address/${address}/utxo`),
      },
      fees: {
        getFeeEstimates: () => fetchApi("fee-estimates"),
        getFeesRecommended: () => fetchApi("v1/fees/recommended"),
      },
      transactions: {
        getTxHex: ({ txid }) => fetchApi(`tx/${txid}/hex`),
        postTx: ({ txhex }) => fetchApi("tx", { body: txhex, method: "POST" }),
      },
    },
  };
};
