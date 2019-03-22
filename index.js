
// gumtree screenshot test
const puppeteer = require('puppeteer');
const axios = require('axios');




(async () => {
// variables
  const searchItem = 'Weber';
  const browser = await puppeteer.launch({headless: false, timeout: 100000});
  const page = await browser.newPage();
const databaseUrl = "http://dbUsername:dbPassword@dbUrl/gumtree-notifier"
  // functions
  const getOldData = async () => {
    try {
      const response = await axios.get(databaseUrl);
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  }

  try {

    // load the page
    await page.goto('https://www.google.com.au/');
    
    // highlight the search bar
    await page.focus('#tsf > div:nth-child(2) > div > div.RNNXgb > div > div.a4bIc > input');

    // input to searchItem
    await page.keyboard.type('weber gumtree queensland');
    
    // Click on search button
    await page.click('#tsf > div:nth-child(2) > div > div.FPdoLc.VlcLAe > center > input[type="submit"]:nth-child(1)');


    // Collect Ad information
    
    // await page.evaluate(() => console.log(`The page ${location.href} has been loaded`));
    await page.screenshot({ path: 'gumtree.png' });

  } catch (error) {

    console.log(`Error: ${error}`);
    
  } finally {

    //await browser.close();

  }

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

// if so send email to ed with the urls from those ads then replace old data in db with new data

// if there are no new ads, dont send email and leave old data in db