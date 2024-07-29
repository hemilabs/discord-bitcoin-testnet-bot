import { Client, GatewayIntentBits } from "discord.js";

import { botToken } from "./config.js";
import { eventDefinitions } from "./events.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

eventDefinitions.forEach(function (event) {
  if (event.once) {
    // @ts-ignore ts(2769)
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    // @ts-ignore ts(2769)
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
});

client.login(botToken);
