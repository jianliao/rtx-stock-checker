
const config = require('./config');
const { Webhook } = require('discord-webhook-node');
const winston = require('winston');
const puppeteer = process.platform === 'linux' ? require('puppeteer-core') : require('puppeteer');
const hook = new Webhook(config.discord_webhook.url);
const launchConfig = process.platform === 'linux' ? { headless: false, executablePath: '/usr/bin/chromium-browser' } : { headless: false }

const main = async () => {
  logger.log('info', 'Stock Status Checking -- Start');
  console.time('Total');
  const browser = await puppeteer.launch(launchConfig);
  try {
    for (let site of config.sites) {
      logger.log('info', `  ${site.username} -- start`);
      const page = await browser.newPage();
      if (site.device) {
        const device = puppeteer.devices[site.device];
        await page.emulate(device);
      }
      try {
        console.time(site.username);
        for (let product of site.products) {
          logger.log('info', `    ${product.name}`);
          await page.goto(product.url);
          const productStatus = await page.evaluate((site) => {
            const result = [];
            const items = Array.from(document.querySelectorAll(site.selectors.item));
            for (let item of items) {
              const stockStatus = item.querySelector(site.selectors.status).textContent.trim();
              if (!site.excluded_flags.includes(stockStatus) || stockStatus === 'Add to Cart') {
                const itemUrl = item.querySelector(site.selectors.url).href;
                const itemName = item.querySelector(site.selectors.name).textContent.trim();
                result.push({ name: itemName, status: stockStatus, url: itemUrl });
              }
            }
            return Promise.resolve(result);
          }, site);
          for (let availableProduct of productStatus) {
            logger.log('info', `    Found One !!!\n${JSON.stringify(availableProduct, undefined, 2)}`);
            setNotification(site.avatar, site.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
          }
        }
        console.timeEnd(site.username);
      } catch(e) {
        logger.log('error', e);
      } finally {
        page.close();
      }
    }
  } catch(e) {
    logger.log('error', e);
  } finally {
    browser.close();
    logger.log('info', 'Stock Status Checking -- End');
  }
  console.timeEnd('Total');
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

const mobile = async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  const iPhone = puppeteer.devices['iPad'];
  await page.emulate(iPhone);
  await page.goto('https://www.adorama.com/l/?searchinfo=rtx%203070&sel=Item-Condition_New-Items');
}

// (async () => mobile())();

(async () => main())();
