/* eslint no-console:off */

import { REST, Routes } from "discord.js";

import { botToken, clientId, guildId } from "./config.js";
import { commandDefinitions } from "./commands.js";

// @ts-ignore ts(2345)
const rest = new REST().setToken(botToken);

const commands = commandDefinitions.map((command) => command.data.toJSON());

console.log(`Started refreshing ${commands.length} slash commands.`);
rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then(function (res) {
    console.log(
      `Successfully reloaded ${/** @type Array */ (res).length} slash commands.`,
    );
  })
  .catch(function (err) {
    console.error(`Failed to reload slash commands: ${err.message}`);
  });
