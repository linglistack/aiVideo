require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createDailySubscription() {
  try {
    // 1. Create a test product
    const product = await stripe.products.create({
      name: 'Test Daily Subscription',
      description: 'A test subscription that bills daily',
    });
    console.log('Created product:', product.id);

    // 2. Create a price with daily billing
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 100, // $1.00
      currency: 'usd',
      recurring: {
        interval: 'day',
        interval_count: 1, // Bill every day
      },
    });
    console.log('Created price:', price.id);

    // 3. Get a test customer or create one
    let customer;
    try {
      // Try to get an existing test customer
      const customers = await stripe.customers.list({ limit: 1 });
      if (customers.data.length > 0) {
        customer = customers.data[0];
        console.log('Using existing customer:', customer.id);
      } else {
        throw new Error('No customers found');
      }
    } catch (error) {
      // Create a new test customer
      customer = await stripe.customers.create({
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: {
          test: 'true'
        }
      });
      console.log('Created new customer:', customer.id);
    }

    // 4. Add a test payment method if needed
    let paymentMethod;
    try {
      const paymentMethods = await stripe.customers.listPaymentMethods(
        customer.id,
        { type: 'card' }
      );
      
      if (paymentMethods.data.length > 0) {
        paymentMethod = paymentMethods.data[0];
        console.log('Using existing payment method:', paymentMethod.id);
      } else {
        throw new Error('No payment methods found');
      }
    } catch (error) {
      // Create a test payment method
      paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });
      
      // Attach to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
      });
      
      // Set as default
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
      
      console.log('Created and attached new payment method:', paymentMethod.id);
    }

    // 5. Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        { price: price.id },
      ],
      default_payment_method: paymentMethod.id,
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Created subscription:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Current period start:', new Date(subscription.current_period_start * 1000));
    console.log('Next billing date:', new Date(subscription.current_period_end * 1000));
    
    // 6. Show the webhook endpoint to monitor
    try {
      const webhooks = await stripe.webhookEndpoints.list();
      console.log('\nWebhooks to monitor:');
      webhooks.data.forEach(webhook => {
        console.log(`- ${webhook.url} (${webhook.id})`);
      });
    } catch (error) {
      console.log('Could not list webhooks:', error.message);
    }

    return {
      productId: product.id,
      priceId: price.id,
      customerId: customer.id,
      subscriptionId: subscription.id,
      nextBillingDate: new Date(subscription.current_period_end * 1000)
    };
  } catch (error) {
    console.error('Error creating test subscription:', error);
    throw error;
  }
}

// Run the test
createDailySubscription()
  .then(result => {
    console.log('\nTest subscription created successfully!');
    console.log('Save these IDs for future reference:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\nTo check if billing occurred, run:');
    console.log(`node -e "require('dotenv').config(); const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); stripe.invoices.list({subscription: '${result.subscriptionId}'}).then(invoices => console.log(invoices.data))"`);
  })
  .catch(error => {
    console.error('Failed to create test subscription:', error);
  }); 