const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../models/Plan');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'aivideo',
});

// IMPORTANT: Replace these with your actual Stripe price IDs from your Stripe Dashboard
// These are temporary placeholder IDs that should work for testing
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// This will create the price IDs if they don't exist yet
async function ensurePriceIds() {
  try {
    // First, create product if it doesn't exist
    let starterProduct = await stripe.products.create({
      name: 'Starter Plan',
      description: 'Perfect for beginners and casual creators',
    });
    
    let growthProduct = await stripe.products.create({
      name: 'Growth Plan',
      description: 'Ideal for growing creators and small businesses',
    });
    
    let scaleProduct = await stripe.products.create({
      name: 'Scale Plan',
      description: 'For professional creators and businesses',
    });

    // Create prices for each product
    let starterMonthly = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 1900, // $19.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    let starterYearly = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 19000, // $190.00
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    let growthMonthly = await stripe.prices.create({
      product: growthProduct.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    let growthYearly = await stripe.prices.create({
      product: growthProduct.id,
      unit_amount: 49000, // $490.00
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    let scaleMonthly = await stripe.prices.create({
      product: scaleProduct.id,
      unit_amount: 9500, // $95.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    let scaleYearly = await stripe.prices.create({
      product: scaleProduct.id,
      unit_amount: 95000, // $950.00
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    console.log('Created price IDs:');
    console.log('Starter Monthly:', starterMonthly.id);
    console.log('Starter Yearly:', starterYearly.id);
    console.log('Growth Monthly:', growthMonthly.id);
    console.log('Growth Yearly:', growthYearly.id);
    console.log('Scale Monthly:', scaleMonthly.id);
    console.log('Scale Yearly:', scaleYearly.id);

    return {
      starterMonthly: starterMonthly.id,
      starterYearly: starterYearly.id,
      growthMonthly: growthMonthly.id,
      growthYearly: growthYearly.id,
      scaleMonthly: scaleMonthly.id,
      scaleYearly: scaleYearly.id
    };
  } catch (error) {
    console.error('Error creating Stripe prices:', error);
    process.exit(1);
  }
}

const seedPlans = async () => {
  try {
    // Get or create price IDs
    const priceIds = await ensurePriceIds();
    
    const plans = [
      {
        name: 'Starter',
        description: 'Perfect for beginners and casual creators',
        features: [
          '10 videos per month',
          'All 200+ UGC avatars',
          'Generate unlimited viral hooks',
          'Create your own AI avatars (25 images and 5 videos)'
        ],
        monthlyPriceId: priceIds.starterMonthly,
        yearlyPriceId: priceIds.starterYearly,
        monthlyPrice: 19,
        yearlyPrice: 190,
        videosLimit: 10,
        active: true
      },
      {
        name: 'Growth',
        description: 'Ideal for growing creators and small businesses',
        features: [
          '50 videos per month',
          'All 200+ UGC avatars',
          'Generate unlimited viral hooks',
          'Create your own AI avatars (100 images and 25 videos)',
          'Publish to TikTok',
          'Schedule/automate videos'
        ],
        monthlyPriceId: priceIds.growthMonthly,
        yearlyPriceId: priceIds.growthYearly,
        monthlyPrice: 49,
        yearlyPrice: 490,
        videosLimit: 50,
        active: true
      },
      {
        name: 'Scale',
        description: 'For professional creators and businesses',
        features: [
          '150 videos per month',
          'All 200+ UGC avatars',
          'Generate unlimited viral hooks',
          'Create your own AI avatars (200 images and 50 videos)',
          'Publish to TikTok',
          'Schedule/automate videos'
        ],
        monthlyPriceId: priceIds.scaleMonthly,
        yearlyPriceId: priceIds.scaleYearly,
        monthlyPrice: 95,
        yearlyPrice: 950,
        videosLimit: 150,
        active: true
      }
    ];

    // Clear existing plans
    await Plan.deleteMany({});
    
    // Insert new plans
    const result = await Plan.insertMany(plans);
    
    console.log(`${result.length} plans seeded successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

seedPlans(); 