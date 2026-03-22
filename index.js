let version = "1.2.1";

// Required packages
const { Client, WebhookClient } = require("discord.js-selfbot-v13");
const fs = require("fs-extra");
const chalk = require("chalk");

// Load config
const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");

let log;
if (config?.Logging?.LogWebhook?.length > 25) {
  log = new WebhookClient({ url: config.Logging.LogWebhook });
}

// Load tokens from tokens.txt file (token channelId)
const rawTokens = fs.readFileSync("./tokens.txt", "utf-8").split("\n").filter(Boolean);

const tokens = rawTokens.map((line) => {
  const [token, channelId] = line.trim().split(/\s+/);
  return {
    token: token.trim(),
    channelIds: [channelId.trim()],
  };
});

if (!tokens.length) {
  throw new Error("No valid tokens found in tokens.txt.");
}

config.tokens = tokens;

// Warn for Replit
if (process.env.REPLIT_DB_URL && (!process.env.TOKENS || !process.env.CONFIG)) {
  console.log(
    "Running on Replit? Set CONFIG and TOKENS as secret variables to protect them."
  );
}

// Login + spam logic
async function Login(token, channelIds) {
  if (!token || !channelIds?.[0]) {
    console.log(chalk.redBright("Invalid token or missing channel ID"));
    return;
  }

  const client = new Client({ checkUpdate: false, readyStatus: false });

  client.login(token).catch(() => {
    console.log(chalk.red(`Failed login: ${token.slice(0, 50)}...`));
  });

  client.on("ready", async () => {
    console.log(`Logged in as ` + chalk.green(client.user.tag));
    client.user.setStatus("invisible");

    const messages = fs
      .readFileSync("./data/messages.txt", "utf-8")
      .split("\n")
      .filter((m) => m.trim().length > 0);

    const channelId = channelIds[0];
    const spamChannel = await client.channels.fetch(channelId).catch(() => null);

    if (!spamChannel) {
      console.log(chalk.red(`Cannot access channel: ${channelId}`));
      return;
    }

    while (true) {
      const message = messages[Math.floor(Math.random() * messages.length)];
      await spamChannel.send(message).catch(() =>
        console.log(chalk.red(`Failed to send message in ${channelId}`))
      );

      // Wait 1.2s - 2s
      const delay = Math.floor(Math.random() * 800) + 1200;
      await new Promise((res) => setTimeout(res, delay));
    }
  });
}

// Start
async function start() {
  console.log(
    chalk.greenBright(`[${version}]`),
    chalk.bold.white(`Spammer by`),
    chalk.cyan(`@kyan0045`)
  );

  for (const acc of config.tokens) {
    await Login(acc.token, acc.channelIds);
  }

  if (log) {
    const embed = {
      title: `Started!`,
      url: "https://github.com/kyan0045/Spammer",
      description: `Loaded ${config.tokens.length} tokens.`,
      color: "#5cf7a9",
      timestamp: new Date(),
      footer: {
        text: "Spammer by @kyan0045",
        icon_url: "https://avatars.githubusercontent.com/u/84374752?v=4",
      },
    };
    log.send({
      username: "Spammer Logs",
      avatarURL: "https://avatars.githubusercontent.com/u/84374752?v=4",
      embeds: [embed],
    });
  }
}

// Crash handling
process.on("unhandledRejection", (reason, p) => {
  if (config.debug) {
    console.log(" [Anti Crash] >> Unhandled Rejection");
    console.log(reason, p);
  }
});
process.on("uncaughtException", (e, o) => {
  if (config.debug) {
    console.log(" [Anti Crash] >> Uncaught Exception");
    console.log(e, o);
  }
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  if (config.debug) {
    console.log(" [Anti Crash] >> Monitor");
    console.log(err, origin);
  }
});
process.on("multipleResolves", (type, promise, reason) => {
  if (config.debug) {
    console.log(" [Anti Crash] >> Multiple Resolves");
    console.log(type, promise, reason);
  }
});

// Go!
start();
