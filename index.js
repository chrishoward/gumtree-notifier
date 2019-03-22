
// gumtree screenshot test
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://gumtree.com.au');
  await page.screenshot({ path: 'example2.png' });

  await browser.close();
})();

// put scraped new ads data into data structure
const newAdsData = {
  ads: [
    {
      id: 000000000, // extract id from scraped url
      url: ""
    },
    {
      id: 000000000, // extract id from scraped url
      url: ""
    },
    {
      id: 000000000, // extract id from scraped url
      url: ""
    }
  ]
}

// fetch old ads data from db

// check to see if any of the new ads ids are not present in the old ads ids

// if so send email to ed with the urls from those ads