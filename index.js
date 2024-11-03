const puppeteer = require('puppeteer')
const fs = require('fs')
const { setTimeout } = require('timers/promises')

let currentEmail = ''

// Function to create a Golaco account
const createGolacoAccount = async (email, password, index) => {
  let captcha = ''
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.setRequestInterception(true)

  // Intercept the GetCaptcha request
  page.on('request', request => {
    if (request.url().includes('/api/User/GetCaptcha')) {
      console.log('Captcha request intercepted:', request.url())
      request.continue()
    } else {
      request.continue()
    }
  })

  // Capture the captcha response
  page.on('response', async response => {
    if (response.url().includes('/api/User/GetCaptcha')) {
      const data = await response.json()
      captcha = data.data.code
    }
  })

  await page.goto('https://www.golacogame.com.br/play/#!/register')

  console.log('Captcha:', captcha)
  await page.waitForSelector(
    '#clever-70354-1062204-sticky-footer-stickyfooter-close'
  )
  await page.click('#clever-70354-1062204-sticky-footer-stickyfooter-close')

  // Fill in the form fields
  await page.type('#txtName', `Roberto ${index}`)
  await page.select('#slcGender', 'M')
  await page.type('#txtTeamName', `Roberto FC ${index}`)
  await page.type('#txtTeamAcronym', 'GFC')
  await page.select('#slcState') // Make sure to add the actual value to select the state

  await setTimeout(3000) // Wait for 3 seconds

  // Select the city and fill in the rest of the form
  await page.select('#slcCity') // Make sure to add the actual value to select the city
  await page.type('#txtEmail', email)
  await page.type('#txtConfirmEmail', email)
  await page.type('#txtPassword', password)
  await page.type('#txtConfirmPassword', password)

  // Input the captcha
  await page.type('#txtCaptcha', captcha)

  // Check the terms of use checkbox
  await page.click('input[name="acceptedTermsOfUse"]')

  // Submit the form
  await page.click('input[type="submit"]')

  console.log('Form submitted.')

  await browser.close()
}

// Function to create a temporary email account
const createTempMailAccount = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = await browser.newPage()

  await page.goto('https://www.emailnator.com')

  await page.waitForSelector(
    '#root > div > main > div.homepage--top > div > div > div > div.mb-3.card > div > div.mb-3.input-group > input'
  )

  const inputValue = await page.$eval(
    '#root > div > main > div.homepage--top > div > div > div > div.mb-3.card > div > div.mb-3.input-group > input',
    input => input.value
  )

  await browser.close()
  return inputValue
}

// Function to check the email inbox for verification emails
const checkEmailBox = async email => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = await browser.newPage()

  await page.goto(`https://www.emailnator.com/inbox/#${email}`)

  await page.waitForSelector('table') // Adjust the selector as needed for your specific table

  const emailToFind = 'noreply@golacogame.com.br'

  const href = await page.evaluate(email => {
    const rows = Array.from(document.querySelectorAll('tr'))
    const targetRow = rows.find(row => {
      const cell = row.querySelector('td > a')
      return cell && cell.textContent.includes(email)
    })
    return targetRow ? targetRow.querySelector('td > a').href : null // Return only the href
  }, emailToFind)

  // Log the href or use it as needed
  if (href) {
    await page.goto(href)
    console.log(`Clicked on the link containing: ${emailToFind}`)
  } else {
    console.log(`No link found containing: ${emailToFind}`)
  }

  await page.waitForSelector(
    '#root > div > section > div > div > div.mb-3.col-lg-6.col-sm-12 > div > div > div.card > div > div > table > tbody > tr:nth-child(2) > td > p:nth-child(3) > a'
  )

  const golacohref = await page.evaluate(() => {
    const anchor = document.querySelector(
      '#root > div > section > div > div > div.mb-3.col-lg-6.col-sm-12 > div > div > div.card > div > div > table > tbody > tr:nth-child(2) > td > p:nth-child(3) > a'
    )
    return anchor ? anchor.href : null
  })

  if (golacohref) {
    await page.goto(golacohref)
    console.log('Account verification link clicked.')
  }

  await setTimeout(5000)
  await browser.close()
}

// Function to save accounts to CSV
const saveAccountsToCSV = accounts => {
  const csvHeader = 'Email,Password\n'
  const csvContent = accounts
    .map(account => `${account.email},${account.password}`)
    .join('\n')
  fs.writeFileSync('accounts.csv', csvHeader + csvContent, { encoding: 'utf8' })
}

// Main function to create multiple accounts
const main = async numberOfAccounts => {
  const accounts = []

  for (let i = 0; i < numberOfAccounts; i++) {
    currentEmail = await createTempMailAccount()
    const password = 'password123' // You can generate or customize this if needed
    await createGolacoAccount(currentEmail, password, index)
    accounts.push({ email: currentEmail, password })
    await setTimeout(6000) // Wait before checking the email box
    await checkEmailBox(currentEmail) // Check the email for verification
  }

  saveAccountsToCSV(accounts)
  console.log('Accounts saved to accounts.csv')
}

// Change the number of accounts you want to create
main(2)
