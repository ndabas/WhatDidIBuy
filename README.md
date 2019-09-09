# WhatDidIBuy

This project is a set of scrapers that will let you collect your order history from electronics distributors and retailers, and save it as CSV files. Invoices in PDF format can also be downloaded and saved.

Currently, these websites are supported:

- [Adafruit](https://www.adafruit.com/)
- [Arrow](https://www.arrow.com/)
- [Digi-Key](https://www.digikey.com/)
- [Mouser](https://www.mouser.com/)
- [RS Components India](https://in.rsdelivers.com/)
- [Seeed Studio (old website - orders upto 2018)](https://www.seeedstudio.com/web/user/order/all)
- [SparkFun](https://www.sparkfun.com/)

## A note about scraping

This project is meant for personal use only -- and was created out of a need to catalog, in one place, what parts I had already ordered in the past, so that I do not end up re-ordering the same things.

Some of these websites do not like being scraped, but that is usually easy to get past, either with some scripts to hide the fact that we are using browser automation, or by solving a CAPTCHA.

Since the scripts are not fully automated (they require the user to log in manually), and will only hit the website in low volumes in order to get a single user's order history, I believe this use of browser automation should be within the usage policies of the websites in question.

In any case, please use your own judgement and restraint when using these scripts.

## Installation and usage

Create a directory where you would like to save the collected CSV files. In that directory, install WhatDidIBuy with:

```
npm install whatdidibuy
```

This will also install [Puppeteer](https://pptr.dev) as a dependency, which will download a local copy of Chromium. If you wish to skip the Chromium download and use your own copy of Chrome or Chromium, please see their documentation about [environment variables](https://pptr.dev/#?product=Puppeteer&version=v1.19.0&show=api-environment-variables).

Next, run WhatDidIBuy with:

```
./node_modules/.bin/whatdidibuy
```

This command will show the available scrapers. For example, to grab your order history from Digi-Key, run:

```
./node_modules/.bin/whatdidibuy digikey
```

This will launch a Chromium window with the Digi-Key website.

### Manual actions

The scrapers will launch the appropriate website but will not automatically log in for you. When you see the website, you will need to:

1. Log in with your credentials.
2. Navigate to the order history page for the website.

The scrapers will wait for the order history page to be shown, and will swing into action at that point.

If everything goes well, you will get two CSV files per website: `website-orders.csv` and `website-items.csv`. Invoices, if available, will be saved to `website/`.

## CSV format

The `*-orders.csv` files have these fields:

- `site` - the scraper that was used to get this data
- `id` - a site-specific order ID
- `date` - order date, in `YYYY-MM-DD` format
- `status` - a site-specific order status

The `*-items.csv` files have these fields:

- `site` - the scraper that was used to get this data
- `ord` - the site-specific order ID
- `idx` - line item index in the order
- `dpn` - distributor part number
- `mpn` - manufacturer part number
- `mfr` - manufacturer
- `qty` - item quantity
- `dsc` - item description
- `upr` - unit price
- `lnk` - link to the item page (may be relative)
- `img` - image URL (may be relative)

Note that all scrapers might not output all of these fields, depending on what data is actually available.

## License

Licensed under the [Apache License, version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

## Credits

Created by [Nikhil Dabas](http://www.nikhildabas.com/).
