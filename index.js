
const config = require('./config');

const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(config.discord_webhook.url);
const puppeteer = require('puppeteer');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp('YYYY-MM-DD HH:mm:ss'),
    winston.format.splat(),
    winston.format.cli(),
    winston.format.prettyPrint(),
    winston.format.printf(info => `${info.timestamp} ${info.level} : ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ],
});

logger.add(new winston.transports.Console({
  format: winston.format.simple(),
}));

const bestbuy = async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    for (let product of config.bestbuy.products) {
      await page.goto(product.url);
      const productStatus = await page.evaluate(() => {
        const result = [];
        const items = Array.from(document.querySelectorAll('.sku-item'));
        for (let item of items) {
          const stockStatus = item.querySelector('.add-to-cart-button').textContent.trim();
          if (stockStatus !== 'Sold Out' && stockStatus !== 'Coming Soon') {
            logger.log('info', `Found one:`);
            const itemUrl = item.querySelector('.sku-header a').href;
            const itemName = item.querySelector('.sku-header a').textContent.trim();
            result.push({ name: itemName, status: stockStatus, url: itemUrl });
            logger.log('info', { name: itemName, status: stockStatus, url: itemUrl });
          }
        }
        return Promise.resolve(result);
      });

      for (let availableProduct of productStatus) {
        setNotification(config.bestbuy.avatar, config.bestbuy.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
      }
    }
  } finally {
    await browser.close();
  }
  return Promise.resolve();
}

const newegg = async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    for (let product of config.newegg.products) {
      await page.goto(product.url);
      const productStatus = await page.evaluate(() => {
        const result = [];
        const items = Array.from(document.querySelectorAll('.item-cell'));
        for (let item of items) {
          const stockStatus = item.querySelector('.item-button-area').textContent.trim();
          if (stockStatus !== 'Sold Out' && stockStatus !== 'Auto Notify') {
            logger.log('info', `Found one:`);
            const itemUrl = item.querySelector('.item-title').href;
            const itemName = item.querySelector('.item-title').textContent.trim();
            result.push({ name: itemName, status: stockStatus, url: itemUrl });
            logger.log('info', { name: itemName, status: stockStatus, url: itemUrl });
          }
        }
        return Promise.resolve(result);
      });

      for (let availableProduct of productStatus) {
        setNotification(config.newegg.avatar, config.newegg.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
      }
    }
  } finally {
    await browser.close();
  }
  return Promise.resolve();
}

const bh = async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    for (let product of config.bh.products) {
      await page.goto(product.url);
      const productStatus = await page.evaluate(() => {
        const result = [];
        const items = Array.from(document.querySelectorAll('[data-selenium="miniProductPageProduct"]'));
        for (let item of items) {
          const stockStatus = item.querySelector('[data-selenium="miniProductPageQuantityContainer"]').textContent.trim();
          if (stockStatus !== 'Notify When Available' || stockStatus === 'Add to Cart') {
            logger.log('info', `Found one:`);
            const itemUrl = item.querySelector('[data-selenium="miniProductPageProductNameLink"]').href;
            const itemName = item.querySelector('[data-selenium="miniProductPageProductNameLink"]').textContent.trim();
            result.push({ name: itemName, status: stockStatus, url: itemUrl });
            logger.log('info', { name: itemName, status: stockStatus, url: itemUrl });
          }
        }
        return Promise.resolve(result);
      });

      for (let availableProduct of productStatus) {
        setNotification(config.bh.avatar, config.bh.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
      }
    }
  } finally {
    await browser.close();
  }
  return Promise.resolve();
}

const adorama = async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    for (let product of config.adorama.products) {
      await page.goto(product.url);
      const productStatus = await page.evaluate(() => {
        const result = [];
        const items = Array.from(document.querySelectorAll('[class="item"]'));
        for (let item of items) {
          const stockStatus = item.querySelector('button').textContent.trim();
          if (stockStatus !== 'Temporarily not available' || stockStatus === 'Add to Cart') {
            logger.log('info', `Found one:`);
            const itemUrl = item.querySelector('.item-details .trackEvent').href;
            const itemName = item.querySelector('.item-details .trackEvent').textContent.trim();
            result.push({ name: itemName, status: stockStatus, url: itemUrl });
            logger.log('info', { name: itemName, status: stockStatus, url: itemUrl });
          }
        }
        return Promise.resolve(result);
      });

      for (let availableProduct of productStatus) {
        setNotification(config.adorama.avatar, config.adorama.username, `${availableProduct.name}\n\n${availableProduct.status}\n\n${availableProduct.url}`);
      }
    }
  } finally {
    await browser.close();
  }
  return Promise.resolve();
}

const setNotification = (imageUrl, userName, msg) => {
  hook.setUsername(userName);
  hook.setAvatar(imageUrl);
  hook.send(msg);
};

(async () => {
  logger.log('info', 'Best Buy -- Start');
  await bestbuy();
  logger.log('info', 'Best Buy -- End');
  logger.log('info', 'Newegg -- Start');
  await newegg();
  logger.log('info', 'Newegg -- End');
  logger.log('info', 'B & H -- Start');
  await bh();
  logger.log('info', 'B & H -- End');
  logger.log('info', 'Adorama -- Start');
  await adorama();
  logger.log('info', 'Adorama -- End');
})();
