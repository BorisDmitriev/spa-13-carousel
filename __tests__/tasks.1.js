const puppeteer = require("puppeteer");
const path = require('path');

let browser;
let page;
let client;
let getListeners;

beforeAll(async () => {
    browser = await puppeteer.launch({headless: true});
    page = await browser.newPage();
    await page.goto('file://' + path.resolve('./index.html'));
    client = await page.target().createCDPSession()

	getListeners = async result => await client.send('DOMDebugger.getEventListeners', {objectId: result.objectId})
}, 30000);

afterAll((done) => {
    try {
        this.puppeteer.close();
    } catch (e) { }
    done();
});

describe("Carousel", () => {
    it("Carousel contains images", async () => {
        const image = await page.$('img');
        expect(image).toBeTruthy();
    });

    it("Slides change upon click on arrows", async () => {
        const imagePositions = await page.$$eval('img', images => images.map(img => img.getBoundingClientRect().left))
        // find clickable element
        let found = false
        const {result: {value: numElements}} = await client.send('Runtime.evaluate', {expression: `document.querySelectorAll('body *').length`})
        for (let index = 0; index < numElements; index++) {
            const { result } = await client.send('Runtime.evaluate', {expression: `document.querySelectorAll('body *')[${index}]`})
            const { listeners } = await getListeners(result)
            if(listeners.find(l => l.type.match(/click|mouseup|mousedown/i))) {
                found = true
                await client.send('Runtime.evaluate', {expression: `document.querySelectorAll('body *')[${index}].click()`})
                break
            }
        }
        if(found) await page.waitForTimeout(500)
        const imagePositionsAfterClick = await page.$$eval('img', images => images.map(img => img.getBoundingClientRect().left))
        expect(imagePositionsAfterClick).not.toEqual(imagePositions)
    })
});