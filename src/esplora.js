import fetch from "fetch-plus-plus";

const hostnames = ["mempool.space", "blockstream.info"];

/**
 * Tiny library to talk to Esplora-based APIs, like Mempool and Blockstream,
 * exposing an API similar to the official Mempool NPM package.
 *
 * NPM packages:
 * https://github.com/mempool/mempool.js
 * https://github.com/MiguelMedeiros/esplora-js
 *
 * API docs:
 * https://mempool.space/docs/api/rest
 * https://github.com/Blockstream/esplora/blob/master/API.md
 */
export const esploraJs = function ({ network }) {
  const basePath = network === "mainnet" ? "api" : `${network}/api`;

  const concatenateErrorMessage = (previousError, hostname) => (fetchError) =>
    Promise.reject(
      new Error(`${previousError.message}, ${hostname}: ${fetchError.message}`),
    );

  const chainFetchCallsOnFailure = (path, init) => (promiseChain, hostname) =>
    promiseChain.catch((err) =>
      fetch(`https://${hostname}/${basePath}/${path}`, init).catch(
        concatenateErrorMessage(err, hostname),
      ),
    );

  const fetchApi = (path, init) =>
    hostnames.reduce(
      chainFetchCallsOnFailure(path, init),
      Promise.reject(new Error("Out of retry options")),
    );

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
