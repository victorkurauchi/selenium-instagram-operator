const { Builder, By, Key, until } = require('selenium-webdriver');
const storage = require('node-persist');

require('chromedriver');

const later = (delay, value) =>
  new Promise(resolve => setTimeout(resolve, delay, value));

(async function main() {
  let driver = await new Builder().forBrowser('chrome').build();

  await storage.init({
    dir: './persistence',
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false,  // can also be custom logging function
    ttl: false, // ttl* [NEW], can be true for 24h default or a number in MILLISECONDS or a valid Javascript Date object
    expiredInterval: 2 * 60 * 1000, // every 2 minutes the process will clean-up the expired cache
    // in some cases, you (or some other service) might add non-valid storage files to your
    // storage dir, i.e. Google Drive, make this true if you'd like to ignore these files and not throw an error
    forgiveParseErrors: false
});

  const hashtags = [
    'instapic',
    'picoftheday',
    'followforfollowback',
    'vscocam',
    'photo',
    'instalike',
    'bestoftheday',
    'instamood',
    'igers',
    'igdaily',
    'photooftheday',
    'traveling',
    'travelblog',
    'travelblogger',
    'like4likes',
    'artofvisuals',
    'vsco'
  ];

  let counter = 0;
  const previousUserList = [];
  const newFollowed = [];
  const commented = [];
  const liked = [];

  const loadHashtagPage = async(driver, tag) => {
    console.log(`Starting to interact with ${tag}`);
    await driver.get(`https://www.instagram.com/explore/tags/${tag}`);
      
    const titleHtmlPage = `#${tag} hashtag on Instagram • Photos and Videos`;
    console.log('Wait for title');
    await driver.wait(until.titleIs(titleHtmlPage), 5000);

    console.log('Wait for element located....');
    await driver.wait(until.elementLocated(By.tagName('a')), 5000);
  }

  const clickOnThumbnail = async(driver) => {
    console.log('Finding thumbnail...');
    const firstThumb = await driver.findElements(By.tagName('a'));

    console.log('Clicking on the modal thumbnail...');
    await firstThumb[0].click();
  }

  const followSomeone = (index, driver, tag) => {
    setTimeout(async() => {
      console.log('\n');
      console.log('Wait for button Follow... With index', index);
      await driver.wait(until.elementLocated(By.tagName('button')), 4000);
      const buttons = await driver.findElements(By.tagName('button'));
      const titles = await driver.findElements(By.tagName('h2'));
      const username = await titles[titles.length - 1].getText();

      if (username) {
        console.log('Username found', username);
      } else {
        console.log('Username not found yet... Probably modal taking longer to load');
        let item = hashtags[Math.floor(Math.random()*hashtags.length)];
        console.log('Will try to find new hashtag', item);
        await loadHashtagPage(driver, item);
        await clickOnThumbnail(driver);
      }

      if (!username) return null;
    
      await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Next')]")), 2000);
      const nextButton = await driver.findElement(By.xpath("//*[contains(text(), 'Next')]"));
    
      if (!previousUserList.includes(username)) {
        const texts = await Promise.all(buttons.map(b => { 
          return b.getText().then(text => {
            // console.log('button text', text);
            if (text === 'Follow') {
              return b;
            }
          })
        }));

        const buttonsFollow = texts.filter(obj => obj);

        // console.log('buttonsFollow', buttonsFollow);
        const follow = buttonsFollow[buttonsFollow.length - 1];
        await follow.click().catch(() => {
          console.log('Failed to follow', username);
          return nextButton.click();
        })
        console.log('Followed', username);
        
        previousUserList.push(username);
        console.log('Added to list', previousUserList.length);
        await nextButton.click();
        console.log('Clicked next photo');
        // await storage.setItem(username, new Date().toISOString);
        return username;
      } else {
        return await nextButton.click();
      }
    }, 0);
  }

  try {
    await driver.get('https://www.instagram.com/accounts/login/?source=auth_switcher');

    await driver.wait(until.elementLocated(By.tagName('input')), 5000, 'Looking for element');
    const userInput = await driver.findElement(By.name('username'));
    const passwordInput = await driver.findElement(By.name('password'));
    await userInput.sendKeys(process.env.USERNAME);
    await passwordInput.sendKeys(process.env.PASSWORD);

    await driver.wait(until.elementLocated(By.tagName('form')), 5000, 'Looking for form');

    // clicking button to login
    const buttonsFirstPage = await driver.findElements(By.tagName('button'));
    await buttonsFirstPage[1].click();

    setTimeout(async() => {
      const tag = hashtags[0];

      // turn notifications offline
      await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Not Now')]")), 5000);
      const turnNotificationsOff = await driver.findElement(By.xpath("//*[contains(text(), 'Not Now')]"));

      console.log('Turning notifications offline...');
      await turnNotificationsOff.click();
      console.log('Notification is offline.');
      
      counter += 1;
      
      await loadHashtagPage(driver, tag);

      console.log('Finding thumbnail...');
      const firstThumb = await driver.findElements(By.tagName('a'));

      console.log('Clicking in the modal thumbnail...');
      await firstThumb[0].click();

      console.log('-----------------------------------');

      for (let index = 1; index <= 500; index++) {
        try {
          await later(3000, followSomeone(index, driver, tag));
        } catch (e) {
          console.log('found something', e);
        }
      }      
    }, 4000);
  } catch (e) {
    console.log('error', e);
  } finally {
    // await driver.quit();
  }
})();
