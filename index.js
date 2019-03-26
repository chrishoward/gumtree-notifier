// npm package imports
const puppeteer = require('puppeteer');
const axios = require('axios');
const AWS = require('aws-sdk');
const config = require('./config');

// set region for SES emailing
AWS.config.update({ region: `${config.awsSesRegion}` });

// choose AWS credentials profile
const credentials = new AWS.SharedIniFileCredentials({ profile: `${config.awsProfile}` });
AWS.config.credentials = credentials;

// declare and immediately invoke function (our script)
(async () => {
  // functions
  const getPreviousAdsDataFromDb = async () => {
    try {
      const httpResponse = await axios.get(`${databaseUrl}/_all_docs?include_docs=true`);
      const previousAdsData = httpResponse.data.rows[0].doc.ads;
      return previousAdsData;
    } catch (error) {
      console.error(error);
    }
  }

  const updateAdsDataInDb = async (scrapedAdsDataArray) => {
    try {
      const httpResponse = await axios.get(`${databaseUrl}/_all_docs?include_docs=true`);
      const document = httpResponse.data.rows[0].doc;
      const previousAdsDataId = document._id;
      const previousAdsDataRev = document._rev;
      const newDocument = {
        "_rev": previousAdsDataRev,
        "ads": scrapedAdsDataArray
      }
      return axios.put(`${databaseUrl}/${previousAdsDataId}`, newDocument)
    } catch (error) {
      console.error(error);
    }
  }

  const getArrayOfNewAds = (previousAdsData, scrapedAdsData) => {
    const newAds = scrapedAdsData.filter(scrapedAd => {
      const scrapedAdId = scrapedAd.id;
      const previousAdsIds = previousAdsData.map(previousAd => {
        return previousAd.id
      })
      return !previousAdsIds.includes(scrapedAdId)
    });
    return newAds;
  }

  const createStringListOfAdLinks = (newAds) => {
    const stringListOfAdLinks = newAds.reduce((result, element) => {
      return result + `${element.url}\n\n`
    }, "")
    return stringListOfAdLinks;
  }

  const sendEmail = async newAds => {
    // create sendEmail params 
    const emailParams = {
      Destination: { /* required */
        CcAddresses: config.ccEmails,
        ToAddresses: config.toEmails
      },
      Message: { /* required */
        Body: { /* required */
          Text: {
            Charset: "UTF-8",
            Data: `Beep boop, new ad:\n\n${createStringListOfAdLinks(newAds)}`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Test email'
        }
      },
      Source: config.fromEmail, /* required */
      ReplyToAddresses: config.replyToEmails,
    };
    // create the promise and SES service object
    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(emailParams).promise();
    // handle promise's resolved/rejected states
    sendPromise.then(data => {
      console.log("email sent");
    }).catch(err => {
      console.error(err, err.stack);
    });
    return sendPromise;
  }

  // variables
  let scrapedAdsData;
  const searchItem = 'Weber';
  const databaseUrl = `http://${config.dbUsername}:${config.dbPassword}@${config.dbUrl}/gumtree-notifier/`

  // get current time to console log
  const start = Date.now();
  const date = new Date;
  const timestamp = date.toLocaleTimeString('en-AU');
  console.log(timestamp, '---------------------');

  // launch puppeteer and open new tab
  console.log('launching chromium and new tab ...');
  const browser = await puppeteer.launch({
    // headless: false,
    timeout: 100000
  });
  const page = await browser.newPage();
  try {
    // load the page
    console.log('navigating to google.com.au ...');
    await page.goto('https://www.google.com.au/', {
      waitUntil: "networkidle0"
    });
    // highlight the search bar
    await page.focus('#tsf > div:nth-child(2) > div > div.RNNXgb > div > div.a4bIc > input');
    // input to searchItem
    await page.keyboard.type('weber gumtree queensland');
    // Click on search button and wait for navigation to finish
    console.log('clicking search button and navigating to results page ...');
    await Promise.all([
      page.waitForNavigation(),
      page.click('#tsf > div:nth-child(2) > div > div.FPdoLc.VlcLAe > center > input[type="submit"]:nth-child(1)')
    ]);
    // Click on first link in google and wait for navigation to finish
    console.log('clicking first google results link and navigating to gumtree results page ...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('div.srg .g:first-child  a')
    ]);
    // Change search box from 'weber bbq' to 'weber'
    await page.click('#input-search-input', { clickCount: 3 })
    await page.keyboard.type('weber');
    console.log('pressing enter to search for just \'weber\' and navigating to new gumtree results page ...');
    await Promise.all([
      page.waitFor(2000),
      page.keyboard.press('Enter')
    ]);
    // change select menu from 'best match' to 'most recent'
    console.log('changing \'best match\' search to \'most recent\' and reloading gumtree results ...');
    await Promise.all([
      page.waitFor(2000),
      page.select('#srp-sort-by', 'date')
    ]);
    // Collect Ad information
    console.log('scraping ads data ...');
    scrapedAdsData = await page.evaluate(() => {
      const adsHtmlCollection = document.getElementsByClassName('user-ad-row');
      const adsArray = Array.from(adsHtmlCollection);
      const scrapedAdsData = adsArray.map(adElement => {
        const href = adElement.getAttribute("href");
        return {
          id: href.substr(href.lastIndexOf('/') + 1),
          url: `http://www.gumtree.com.au${adElement.getAttribute("href")}`
        }
      })
      return scrapedAdsData;
    })
    console.log('scraping complete');
  } catch (error) {
    console.log(`scraping failed: ${error}`);
  } finally {
    await browser.close();
  }

  // fake data for testing purposes
  // scrapedAdsData = [
  //   {
  //     id: 1, // extract id from scraped url
  //     url: "http://www.1.com"
  //   }
  // ]

  // fetch ads data from previous scraping run from db
  console.log('getting previous ads data from db ...');
  const previousAdsData = await getPreviousAdsDataFromDb();
  // when first page ads are deleted, ads from the second page are brought into the bottom of the first page which is determined to be a new ad. only assess first half of first page ads to avoid this
  const subsetScrapedAdsData = scrapedAdsData.slice(0, 11)
  // check to see if any of the new ads ids are not present in the old ads ids
  const newAds = getArrayOfNewAds(previousAdsData, subsetScrapedAdsData)
  // number of new ads found
  const qtyNewAdsFound = newAds.length;
  console.log('new ads found: ', qtyNewAdsFound);
  // boolean of whether there are new ads found
  const newAdsFound = qtyNewAdsFound > 0;
  // if new ads found send email to ed with the urls from those ads
  if (newAdsFound) {
    // put the scraped ads array into db
    console.log('storing scraped ads data in db ...');
    await updateAdsDataInDb(scrapedAdsData);
    // send email
    console.log('sending email ...');
    await sendEmail(newAds);
  } // end of 'if (newAdsFound) { ... }'
  // if there are no new ads, dont send email and leave old data in db (do nothing)
  const end = Date.now();
  const timeElapsed = (end - start) / 1000;
  console.log('time taken: ', `${timeElapsed} seconds`);
})();