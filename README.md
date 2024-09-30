# Bitcoin faucet Discord bot

A Discord bot that dispenses testnet bitcoin.

## Usage

Once installed in a Discord server and running, the bot provides these slash commands:

- `/btc-faucet-balance`: Reports the testnet BTC balance of the faucet.
- `/btc-faucet address`: Sends testnet BTC from the faucet to the given address.

## Installation and configuration

Create the bot in Discord, configure it as needed and set the following environment variables:

- `BOT_TOKEN`: The token the bot uses to call the Discord API.
- `CLIENT_ID`: The application id.
- `GUILD_ID`: The id of the Discord server.
- `LOG_CHANNEL_ID`: The id of the channel where execution and errors logs are sent.

Also set the following environment variable to hold the private key used to manage the testnet bitcoin funds:

- `PRIVATE_KEY`

Finally, these two environment variable can be used to customize the faucet behavior:

- `FAUCET_COOL_DOWN`: Wait time in seconds in between calls to `/btc-faucet` coming from the same user. Defaults to 1 hour.
- `SATS_AMOUNT`: Amount of sats dispensed by calling to `/btc-faucet`. Defaults to 0.001 tBTC.

Optionally, create a `.env` file to host all these variables.

## Execution

Use the following commands to build and run the bot:

```sh
docker build -t hemilabs/discord-bitcoin-testnet-bot:latest .
docker run -d --rm hemilabs/discord-bitcoin-testnet-bot:latest
```

## Publishing new versions

Once the desired changes are merged into the `master` branch, tag the branch and push the tag:

```sh
git tag -s -m "" "v$(jq -r '.version' <package.json)"
git push --tags
```

Then the Docker image will be automatically built and pushed to Docker Hub.
The deployment will also be automatically triggered after that.
