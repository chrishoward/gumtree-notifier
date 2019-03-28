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

  const getArrayOfNewAds = (previousAdsData, subsetScrapedAdsData) => {
    const newAds = subsetScrapedAdsData.filter(scrapedAd => {
      const scrapedAdId = scrapedAd.id;
      const previousAdsIds = previousAdsData.map(previousAd => {
        return previousAd.id
      })
      if (previousAdsIds.includes(scrapedAdId)) {
        return false;
      }
      return true;
    });
    return newAds;
  }

  const getScreenshotsOfNewAds = async (newAds, page) => {
    return await Promise.all(
      newAds.map(async newAd => {
        await page.evaluate((newAd) => {
          const leaderboardAd = document.querySelector(".header__leaderboard-ad");
          if (leaderboardAd) {
            leaderboardAd.remove()
          }
          document.querySelector(`#user-ad-${newAd.id}`).scrollIntoView();
        }, newAd);
        await page.waitFor(2000);
        const newAdElementHandle = await page.$(`#user-ad-${newAd.id}`);
        const newAdScreenshot = await newAdElementHandle.screenshot({
          type: "jpeg",
          quality: 100,
          encoding: 'base64'
        });
        return {
          ...newAd,
          screenshot: newAdScreenshot
        }
      })
    )
  }

  const createEmailMessage = (newAdsWithScreenshots) => {
    let msg = "";
    msg += `To: ${config.toEmail}\n`;
    msg += `From: ${config.fromEmail}\n`;
    msg += `CC: ${config.ccEmail}\n`;
    msg += `Subject: # ${newAdsWithScreenshots[0].title}\n`;
    msg += "MIME-Version: 1.0\n";
    msg += "Content-Type: multipart/related; boundary=\"NextPart\"\n\n";
    msg += "--NextPart\n";
    msg += "Content-Type: text/html\n\n";
    newAdsWithScreenshots.forEach(newAdWithScreenshot => {
      msg += `<a href=\"${newAdWithScreenshot.url}\"><img src=\"cid:${newAdWithScreenshot.id}@${config.contentIdDomain}\" width=\"800\"></a><br><br>`
    })
    msg += "\n\n"
    newAdsWithScreenshots.forEach(newAdWithScreenshot => {
      msg += "--NextPart\n";
      msg += `Content-Type: image/jpeg; name=\"${newAdWithScreenshot.id}.jpg\"\n`;
      msg += "Content-Transfer-Encoding: base64\n";
      msg += `Content-Disposition: inline; filename=\"${newAdWithScreenshot.id}.jpg\"\n`;
      msg += `Content-ID: <${newAdWithScreenshot.id}@${config.contentIdDomain}>\n\n`;
      msg += newAdWithScreenshot.screenshot.replace(/([^\0]{76})/g, "$1\n") + "\n\n";
    })
    msg += "--NextPart--";
    return msg;
  }

  const sendRawEmail = async (newAdsWithScreenshots) => {
    const msg = createEmailMessage(newAdsWithScreenshots);
    const emailParams = {
      RawMessage: { Data: msg },
      Source: config.tempEmail
    };
    // create the promise and SES service object
    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendRawEmail(emailParams).promise();
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
  // production url
  const gumtreeUrl = "https://www.gumtree.com.au/s-bbq/qld/weber/k0c20067l3008841";
  // testing url
  // const gumtreeUrl = "https://www.gumtree.com.au/s-bbq/c20067";

  // get current time to console log
  const start = Date.now();
  const date = new Date;
  const timestamp = date.toLocaleTimeString('en-AU');
  console.log(timestamp, '---------------------');

  // launch puppeteer and open new tab
  console.log('launching chromium and new tab ...');
  const browser = await puppeteer.launch({
    // headless: false
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 2 });
    console.log(`going to ${gumtreeUrl} ...`);
    await page.goto(`${gumtreeUrl}`, { waitUntil: "domcontentloaded" });
    await page.waitFor(4000);
    console.log('pressing enter to search for just \'weber\' and navigating to new gumtree results page ...');
    // change select menu from 'best match' to 'most recent'
    console.log('changing \'best match\' search to \'most recent\' and reloading gumtree results ...');
    await Promise.all([
      page.waitFor(4000),
      page.select('#srp-sort-by', 'date')
    ]);
    // Collect Ad information
    console.log('scraping ads data ...');
    let img;
    scrapedAdsData = await page.evaluate(() => {
      // delete top ads section so it doesn't get scraped
      const topAdsSection = document.getElementsByClassName("panel search-results-page__top-ads-wrapper user-ad-collection user-ad-collection--row")[0]
      if (topAdsSection) {
        topAdsSection.remove();
      }
      // get HTMLCollection of ads 
      const adsHtmlCollection = document.getElementsByClassName("user-ad-row");
      // convert adsHtmlCollection to array so we can use the map array helper method
      const adsArray = Array.from(adsHtmlCollection);
      const scrapedAdsData = adsArray.map((adElement, adIndex) => {
        const url = adElement.getAttribute("href");
        const title = adElement.getElementsByClassName("user-ad-row__title")[0].innerHTML;
        return {
          id: url.substr(url.lastIndexOf('/') + 1),
          title,
          url: `http://www.gumtree.com.au${url}`,
        }
      })
      return scrapedAdsData;
    })
    console.log('scraping complete');
    // fetch ads data from previous scraping run from db
    console.log('getting previous ads data from db ...');
    const previousAdsData = await getPreviousAdsDataFromDb();
    // when first page ads are deleted, ads from the second page are brought into the bottom of the first page which is determined to be a new ad. only assess first half of first page ads to avoid this
    const subsetScrapedAdsData = scrapedAdsData.slice(0, 12)
    // check to see if any of the new ads ids are not present in the old ads ids
    const newAds = getArrayOfNewAds(previousAdsData, subsetScrapedAdsData)
    // number of new ads found
    const qtyNewAdsFound = newAds.length;
    console.log('new ads found: ', qtyNewAdsFound);
    const newAdsIds = newAds.reduce((result, element) => {
      return result += `${element.id}, `;
    }, "")
    console.log('new ads ids: ', newAdsIds);
    // boolean of whether there are new ads found
    const newAdsFound = qtyNewAdsFound > 0;
    // if new ads found send email to ed with the urls from those ads
    if (newAdsFound) {
      // put the scraped ads array into db
      console.log('storing scraped ads data in db ...');
      await updateAdsDataInDb(scrapedAdsData);
      // add screenshots data to newAds array for emailing
      const newAdsWithScreenshots = await getScreenshotsOfNewAds(newAds, page);
      // // send email
      console.log('sending email ...');
      await sendRawEmail(newAdsWithScreenshots);
    } // end of 'if (newAdsFound) { ... }'
    // if there are no new ads, dont send email and leave old data in db (do nothing)
    const end = Date.now();
    const timeElapsed = (end - start) / 1000;
    console.log('time taken: ', `${timeElapsed} seconds`);
  } catch (error) {
    console.log("script error:", error);
  } finally {
    // close browser
    await browser.close();
  }
})();