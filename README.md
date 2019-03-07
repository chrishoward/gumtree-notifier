# gumtree-notifier

Tech Stack

- Node.js.
- Puppeteer (JS in node.js) - Scraping.
- MongoDB (Running on EC2) - Storing data.
- Lambda Functions - (Function execution on demand)

Requirements

- Watch gumtree every minute for a searched item.
  - Retrieving existing items.
    - Request data from MongoDB.
    - Check response to see if data exists.
    - If it doesn't exist, stop function.
  - Scraping the site for items.
    - Using puppeteer for retrieving items ( Node.js ).
    - Open web page.
    - Input search for item.
    - Scrape the Ad links, Ad ID's.
  - Compare newly scraped items to existing items. - Check if there are new entries in the newly scraped data set. - If there are new entries - Send Notifications of newly listed items. - Store items if there are new items.