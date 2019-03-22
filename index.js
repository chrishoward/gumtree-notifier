
// package imports
const puppeteer = require('puppeteer');
const axios = require('axios');
const AWS = require('aws-sdk');

// region for SES emailing
AWS.config.update({ region: 'us-east-1' });

// choose AWS credentials profile
const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
AWS.config.credentials = credentials;

(async () => {
  // variables
  const searchItem = 'Weber';
  const browser = await puppeteer.launch({ headless: false, timeout: 100000 });
  const page = await browser.newPage();
  const databaseUrl = "http://dbUsername:dbPassword@dbUrl/gumtree-notifier/_all_docs?include_docs=true"
  // functions
  const getPreviousAdsDataFromDb = async () => {
    try {
      const httpResponse = await axios.get(databaseUrl);
      const previousAdsData = httpResponse.data.rows[0].doc.ads;
      return previousAdsData;
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

  //   // Collect Ad information


  //await browser.close();

  // } catch (error) {

  //   console.log(`Error: ${error}`);

  // } finally {

  //   await browser.close();

  // }

  // put scraped new ads data into data structure
  const scrapedAdsData = [
    {
      id: 1, // extract id from scraped url
      url: "http://www.1.com"
    },
    {
      id: 2, // extract id from scraped url
      url: "http://www.2.com"
    },
    {
      id: 4, // extract id from scraped url
      url: "http://www.4.com"
    }
  ]

  // fetch old ads data from db
  const previousAdsData = await getPreviousAdsDataFromDb();

  // check to see if any of the new ads ids are not present in the old ads ids
  const newAds = getArrayOfNewAds(previousAdsData, scrapedAdsData)

  const qtyNewAdsFound = newAds.length;
  const newAdsFound = qtyNewAdsFound > 0;
  console.log('New ads found: ', qtyNewAdsFound);

  // if new ads found send email to ed with the urls from those ads
  if (newAdsFound) {
    // Create sendEmail params 
    const params = {
      Destination: { /* required */
        // CcAddresses: [
        // 'example@gmail.com'
        // ],
        ToAddresses: [
          // 'example@gmail.com'
          'example@gmail.com'
        ]
      },
      Message: { /* required */
        Body: { /* required */
          // Html: {
          //  Charset: "UTF-8",
          //  Data: "HTML_FORMAT_BODY"
          // },
          Text: {
            Charset: "UTF-8",
            Data: `Beep boop, new ad big nuts:\n${JSON.stringify(newAds)}`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Test email'
        }
      },
      Source: 'example@gmail.com', /* required */
      ReplyToAddresses: [
        'example@gmail.com'
      ],
    };

    // Create the promise and SES service object
    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(data => {
      console.log(data.MessageId);
    }).catch(err => {
      console.error(err, err.stack);
    });

    // if new ads found put the scraped ads array into db (overwrite previous?)

  } // end of 'if (newAdsFound) { ... }'

  // if there are no new ads, dont send email and leave old data in db

})();