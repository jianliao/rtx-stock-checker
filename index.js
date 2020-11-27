
const config = require('./config');

const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(config.discord_webhook.url);
const puppeteer = process.platform === 'linux' ? require('puppeteer-core') : require('puppeteer');
const launchConfig = process.platform === 'linux' ? { headless: false, executablePath: '/usr/bin/chromium-browser' } : { headless: false }
const winston = require('winston');

const main = async () => {
  logger.log('info', 'Stock Status Checking -- Start');
  const browser = await puppeteer.launch(launchConfig);
  try {
    for (let site of config.sites) {
      logger.log('info', `${site.username} -- start`);
      const page = await browser.newPage();
      for (let product of site.products) {
        logger.log('info', `  ${product.name}`);
        await page.goto(product.url);
        const productStatus = await page.evaluate((site) => {
          const result = [];
          const items = Array.from(document.querySelectorAll(site.selectors.item));
          for (let item of items) {
            const stockStatus = item.querySelector(site.selectors.status).textContent.trim();
            if (!site.excluded_flags.includes(stockStatus)) {
              const itemUrl = item.querySelector(site.selectors.url).href;
              const itemName = item.querySelector(site.selectors.name).textContent.trim();
              result.push({ name: itemName, status: stockStatus, url: itemUrl });
            }
          }
          return Promise.resolve(result);
        }, site);
        for (let availableProduct of productStatus) {
          logger.log('info', `Found One !!!\n ${availableProduct}`);
          setNotification(site.avatar, site.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
        }
      }
      logger.log('info', `${site.username} -- end`);
    }
  } finally {
    browser.close();
    logger.log('info', 'Stock Status Checking -- End');
  }
  return Promise.resolve();
};

const setNotification = (imageUrl, userName, msg) => {
  hook.setUsername(userName);
  hook.setAvatar(imageUrl);
  hook.send(msg);
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp('YYYY-MM-DD HH:mm:ss'),
    winston.format.splat(),
    winston.format.cli(),
    winston.format.prettyPrint(),
    winston.format.printf(info => `${info.timestamp}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ],
});

logger.add(new winston.transports.Console({
  format: winston.format.simple(),
}));

(async () => main())();
