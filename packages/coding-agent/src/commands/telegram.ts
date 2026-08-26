/**
 * Run Oh My Pi as a Telegram Bot.
 */

import { Command } from "@oh-my-pi/pi-utils/cli";
import { telegramHelp as commandHelp } from "../cli/command-help";
import { runTelegramBotCli } from "@oh-my-pi/pi-telegram-bot";

export default class Telegram extends Command {
  static description = commandHelp.description;
  static strict = false;

  async run(): Promise<void> {
    await runTelegramBotCli(this.argv);
  }
}
