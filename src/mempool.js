const mempoolSpaceApiBaseUrl = "https://mempool.space/testnet/api/";

async function fetchMempoolApi(path, init) {
  const res = await fetch(`${mempoolSpaceApiBaseUrl}${path}`, init);
  const contentType = res.headers.get("Content-Type");
  if (contentType?.startsWith("application/json")) {
    return res.json();
  } else if (contentType?.startsWith("text/plain")) {
    return res.text();
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}

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
