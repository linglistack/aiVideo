require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

// PayPal credentials
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Get command line arguments
const args = process.argv.slice(2);
const provider = args[0]?.toLowerCase(); // stripe or paypal
const subscriptionId = args[1];

// Get PayPal access token
async function getPayPalAccessToken() {
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      auth: {
        username: PAYPAL_CLIENT_ID,
        password: PAYPAL_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'grant_type=client_credentials'
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Check Stripe subscription
async function checkStripeSubscription(subscriptionId) {
  try {
    console.log(`\nChecking Stripe subscription: ${subscriptionId}`);
    
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('\nSubscription Details:');
    console.log(`Status: ${subscription.status}`);
    console.log(`Start date: ${new Date(subscription.start_date * 1000)}`);
    console.log(`Current period start: ${new Date(subscription.current_period_start * 1000)}`);
    console.log(`Current period end: ${new Date(subscription.current_period_end * 1000)}`);
    console.log(`Cancel at period end: ${subscription.cancel_at_period_end}`);
    
    // Get invoices for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 10,
    });
    
    console.log('\nInvoice History:');
    for (const invoice of invoices.data) {
      console.log(`Invoice ${invoice.id} - ${new Date(invoice.created * 1000)}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
      console.log(`  Period: ${new Date(invoice.lines.data[0].period.start * 1000)} to ${new Date(invoice.lines.data[0].period.end * 1000)}`);
      console.log(`  URL: ${invoice.hosted_invoice_url || 'N/A'}`);
      console.log('  -----------------');
    }
    
    // Get upcoming invoice if subscription is active
    if (subscription.status === 'active') {
      try {
        const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          subscription: subscriptionId,
        });
        console.log('\nUpcoming Invoice:');
        console.log(`Amount: $${(upcomingInvoice.amount_remaining / 100).toFixed(2)}`);
        console.log(`Period: ${new Date(upcomingInvoice.lines.data[0].period.start * 1000)} to ${new Date(upcomingInvoice.lines.data[0].period.end * 1000)}`);
      } catch (error) {
        console.log('\nNo upcoming invoice available');
      }
    }
    
    return { subscription, invoices: invoices.data };
  } catch (error) {
    console.error('Error checking Stripe subscription:', error);
    throw error;
  }
}

// Check PayPal subscription
async function checkPayPalSubscription(subscriptionId) {
  try {
    console.log(`\nChecking PayPal subscription: ${subscriptionId}`);
    
    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Get subscription details
    const subscription = await axios({
      method: 'get',
      url: `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).then(res => res.data);
    
    console.log('\nSubscription Details:');
    console.log(`Status: ${subscription.status}`);
    console.log(`Created: ${new Date(subscription.create_time)}`);
    console.log(`Start time: ${new Date(subscription.start_time)}`);
    console.log(`Next billing time: ${subscription.billing_info?.next_billing_time ? new Date(subscription.billing_info.next_billing_time) : 'Not available'}`);
    console.log(`Last payment: ${subscription.billing_info?.last_payment?.time ? new Date(subscription.billing_info.last_payment.time) : 'Not available'}`);
    
    // Get transaction history
    const transactions = await axios({
      method: 'get',
      url: `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=${encodeURIComponent(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).then(res => res.data);
    
    console.log('\nTransaction History:');
    if (transactions.transactions && transactions.transactions.length > 0) {
      for (const transaction of transactions.transactions) {
        console.log(`Transaction ${transaction.id} - ${new Date(transaction.time)}`);
        console.log(`  Status: ${transaction.status}`);
        console.log(`  Amount: ${transaction.amount_with_breakdown.gross_amount.value} ${transaction.amount_with_breakdown.gross_amount.currency_code}`);
        console.log(`  Type: ${transaction.status_details?.reason || 'N/A'}`);
        console.log('  -----------------');
      }
    } else {
      console.log('No transactions found');
    }
    
    return { subscription, transactions: transactions.transactions || [] };
  } catch (error) {
    console.error('Error checking PayPal subscription:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Main function
async function main() {
  if (!provider || !subscriptionId) {
    console.log('\nUsage: node check-subscriptions.js <provider> <subscription_id>');
    console.log('\nProvider: stripe or paypal');
    console.log('Example: node check-subscriptions.js stripe sub_12345');
    console.log('Example: node check-subscriptions.js paypal I-123456789');
    
    console.log('\nList available subscriptions:');
    console.log('  node check-subscriptions.js list-stripe');
    console.log('  node check-subscriptions.js list-paypal');
    return;
  }
  
  if (provider === 'list-stripe') {
    // List recent Stripe subscriptions
    const subscriptions = await stripe.subscriptions.list({ limit: 10 });
    console.log('\nRecent Stripe subscriptions:');
    for (const sub of subscriptions.data) {
      console.log(`ID: ${sub.id} - Status: ${sub.status} - Created: ${new Date(sub.created * 1000)}`);
    }
    return;
  }
  
  if (provider === 'list-paypal') {
    console.log('\nTo list PayPal subscriptions, please check your PayPal dashboard.');
    return;
  }
  
  if (provider === 'stripe') {
    await checkStripeSubscription(subscriptionId);
  } else if (provider === 'paypal') {
    await checkPayPalSubscription(subscriptionId);
  } else {
    console.log('Invalid provider. Use "stripe" or "paypal"');
  }
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 