# gumtree-notifier

Tech Stack

- Node.js.
- Puppeteer (JS in node.js) - Scraping.
- CouchDB (Running on EC2) - Storing data. (includes HTTP API interface)
- Script running at set intervals on EC2 instance in Node
- AWS SES - Simple Email Service - Sending notifications

Requirements
--- INITIAL SETUP ---

- Create AWS account. - Moses
- Create/configure EC2 Instance - Moses
- Install/configure CouchDb database (incl. Auth) - Moses
- Set up Node / repo on EC2 instance
- Setup AWS SES - Email notifications

--- LAMBDA FUNCTION ---

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
  - Compare newly scraped items to existing items.
    - Check if there are new entries in the newly scraped data set.
    - If there are new entries.
      - Send Notifications of newly listed items.
        - AWS SES - Using requests to communicate with API to send Emails.
      - Store items if there are new items.
        - Send request for new data to replace old data in document in database.
