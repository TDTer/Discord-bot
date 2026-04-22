import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import { getRandomDish } from './dishes.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

const LUNCH_TZ = process.env.LUNCH_TZ || 'Asia/Ho_Chi_Minh';
// channelId -> { task, time }
const channelReminders = new Map();

function sendLunchReminder(channelId) {
  return DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: `@here ⏰ Đến giờ ăn trưa rồi các vợ! How about **${getRandomDish()}** today? ${getRandomEmoji()}`,
        },
      ],
      allowed_mentions: { parse: ['everyone'] },
    },
  });
}

function setChannelReminder(channelId, hour, minute) {
  const existing = channelReminders.get(channelId);
  if (existing) existing.task.stop();
  const expr = `${minute} ${hour} * * *`;
  const task = cron.schedule(
    expr,
    async () => {
      try {
        await sendLunchReminder(channelId);
      } catch (err) {
        console.error('Lunch reminder failed:', err);
      }
    },
    { timezone: LUNCH_TZ },
  );
  channelReminders.set(channelId, {
    task,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  });
}

function clearChannelReminder(channelId) {
  const existing = channelReminders.get(channelId);
  if (existing) {
    existing.task.stop();
    channelReminders.delete(channelId);
    return true;
  }
  return false;
}

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    if (name === 'reminder') {
      const timeArg = (data.options?.[0]?.value || '').trim().toLowerCase();
      const channelId = req.body.channel_id;

      if (timeArg === 'off') {
        const existed = clearChannelReminder(channelId);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: existed
                  ? '🔕 Lunch reminder disabled for this channel.'
                  : 'ℹ️ No reminder was set for this channel.',
              },
            ],
          },
        });
      }

      const match = timeArg.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!match) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: '⚠️ Invalid time. Use `HH:MM` (24h, e.g. `11:30`) or `off`.',
              },
            ],
          },
        });
      }

      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      setChannelReminder(channelId, hour, minute);
      const { time } = channelReminders.get(channelId);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `✅ Lunch reminder set for **${time}** daily (${LUNCH_TZ}).`,
            },
          ],
        },
      });
    }

    if (name === 'lunch') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `🍽️ Today's pick: **${getRandomDish()}** ${getRandomEmoji()}`,
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: 'lunch_reroll',
                  label: 'Pick again',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;

    if (componentId === 'lunch_reroll') {
      return res.send({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `🍽️ New pick: **${getRandomDish()}** ${getRandomEmoji()}`,
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: 'lunch_reroll',
                  label: 'Pick again',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

const defaultChannelId = process.env.LUNCH_CHANNEL_ID;
const defaultTime = (process.env.LUNCH_TIME || '').trim();
if (defaultChannelId && defaultTime) {
  const m = defaultTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) {
    setChannelReminder(defaultChannelId, parseInt(m[1], 10), parseInt(m[2], 10));
    console.log(`Default lunch reminder: ${defaultTime} (${LUNCH_TZ}) in channel ${defaultChannelId}`);
  } else {
    console.log(`LUNCH_TIME "${defaultTime}" invalid, skipped default reminder`);
  }
}

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
