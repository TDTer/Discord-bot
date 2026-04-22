import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

// Pick a random lunch dish
const LUNCH_COMMAND = {
  name: 'lunch',
  description: 'Pick a random dish for lunch',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Set / disable lunch reminder for this channel (Vietnam time)
const REMINDER_COMMAND = {
  name: 'reminder',
  description: 'Set lunch reminder time for this channel (Asia/Ho_Chi_Minh). Use "off" to disable.',
  options: [
    {
      type: 3,
      name: 'time',
      description: 'HH:MM (24h, Vietnam time), or "off" to disable',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, LUNCH_COMMAND, REMINDER_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
