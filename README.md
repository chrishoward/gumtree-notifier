# gumtree-notifier

Tech Stack
- Node.js.
- Puppeteer (JS in node.js) - Scraping.
- MongoDB (Running on EC2) - Storing data.
- Lambda Functions - (Function execution on demand)
  - Serverless framework
- AWS SES - Simple Email Service - Sending notifications

Requirements
--- INITIAL SETUP ---
- Create AWS account. - Moses
  - Create EC2 Instance - Moses
    - Install MongoDb database - Moses
  - Setup AWS SES - Email notifications
- NPM - Node package manager
  - Serverless framework - Install package

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
