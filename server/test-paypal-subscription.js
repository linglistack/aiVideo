require('dotenv').config();
const axios = require('axios');

// PayPal credentials
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getAccessToken() {
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

// Create a daily billing product
async function createProduct(accessToken) {
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/catalogs/products`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        name: 'Test Daily Subscription',
        description: 'A test subscription that bills daily',
        type: 'SERVICE',
        category: 'SOFTWARE'
      }
    });

    console.log('Created PayPal product:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal product:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Create a daily billing plan
async function createPlan(accessToken, productId) {
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/billing/plans`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        product_id: productId,
        name: 'Daily Test Plan',
        description: 'Daily billing for testing',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'DAY',
              interval_count: 1
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Indefinite
            pricing_scheme: {
              fixed_price: {
                value: '1.00',
                currency_code: 'USD'
              }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: 'USD'
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        }
      }
    });

    console.log('Created PayPal plan:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal plan:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Create a subscription
async function createSubscription(accessToken, planId) {
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/billing/subscriptions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        plan_id: planId,
        start_time: new Date(Date.now() + 60 * 1000).toISOString(), // Start 1 minute from now
        subscriber: {
          name: {
            given_name: 'John',
            surname: 'Doe'
          },
          email_address: 'customer@example.com'
        },
        application_context: {
          brand_name: 'AI Video',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: 'https://example.com/return',
          cancel_url: 'https://example.com/cancel'
        }
      }
    });

    console.log('Created PayPal subscription:', response.data.id);
    console.log('Status:', response.data.status);
    console.log('Approval URL:', response.data.links.find(link => link.rel === 'approve').href);
    
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal subscription:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Run the test
async function runPayPalTest() {
  try {
    console.log('Starting PayPal subscription test...');
    
    // 1. Get access token
    const accessToken = await getAccessToken();
    console.log('Got PayPal access token');
    
    // 2. Create product
    const product = await createProduct(accessToken);
    
    // 3. Create plan with daily billing
    const plan = await createPlan(accessToken, product.id);
    
    // 4. Create subscription
    const subscription = await createSubscription(accessToken, plan.id);
    
    // 5. Return results
    return {
      productId: product.id,
      planId: plan.id,
      subscriptionId: subscription.id,
      approvalUrl: subscription.links.find(link => link.rel === 'approve').href,
      status: subscription.status
    };
  } catch (error) {
    console.error('Failed to run PayPal test:', error);
    throw error;
  }
}

// Run the test
runPayPalTest()
  .then(result => {
    console.log('\nPayPal test subscription created successfully!');
    console.log('Save these IDs for future reference:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nIMPORTANT: You must complete the subscription by:');
    console.log('1. Opening the approval URL in a browser');
    console.log('2. Logging into PayPal');
    console.log('3. Approving the subscription');
    console.log('\nApproval URL:', result.approvalUrl);
  })
  .catch(error => {
    console.error('PayPal test failed:', error);
  }); 