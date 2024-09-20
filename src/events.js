import { Collection, Events } from "discord.js";
import { formatDistanceToNowStrict } from "date-fns";

import { commandDefinitions } from "./commands.js";
import * as config from "./config.js";

const toStars = (str) => str.replaceAll(/./g, "x");

const commands = commandDefinitions.reduce(
  (collection, command) => collection.set(command.data.name, command),
  new Collection(),
);

const coolDowns = new Collection();

const onReadyEvent = {
  async execute(client) {
    client.user.setStatus("online");
    const logChannel = client.channels.cache.get(config.logChannelId);
    await logChannel.send(`Bot started as ${client.user.tag} and ready!`);
    const sanitizedConfig = {
      ...config,
      botToken: toStars(config.botToken),
      privateKey: toStars(config.privateKey),
    };
    await logChannel.send(`Config: ${JSON.stringify(sanitizedConfig)}`);
  },
  name: Events.ClientReady,
  once: true,
};

const onInteractionCreateEvent = {
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    if (!coolDowns.has(command.data.name)) {
      coolDowns.set(command.data.name, new Collection());
    }
    const timestamps = coolDowns.get(command.data.name);
    if (
      timestamps.has(interaction.user.id) &&
      timestamps.get(interaction.user.id) > Date.now()
    ) {
      const waitTime = formatDistanceToNowStrict(
        new Date(timestamps.get(interaction.user.id)),
      );
      await interaction.reply({
        content: `Please wait ${waitTime} before executing this command again.`,
        ephemeral: true,
      });
      return;
    }

    try {
      const success = await command.execute(client, interaction);
      if (success) {
        timestamps.set(
          interaction.user.id,
          Date.now() + command.coolDown * 1000,
        );
      }
    } catch (err) {
      const logChannel = client.channels.cache.get(config.logChannelId);
      await logChannel.send(`Command execution failure: ${err.message}`);
      try {
        const content = `Something went wrong: ${err.message}`;
        if (interaction.replied) {
          await interaction.editReply(content);
        } else {
          await interaction.reply(content);
        }
      } catch (innerError) {
        await logChannel.send(`Command reply failure: ${innerError.message}`);
      }
    }
  },
  name: Events.InteractionCreate,
};

export const eventDefinitions = [onReadyEvent, onInteractionCreateEvent];
