const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Helper to format currency
handlebars.registerHelper('formatCurrency', function(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
});

// Helper to format date
handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Load email template
const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  try {
    const template = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(template);
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error);
    // Fallback to basic template if file doesn't exist
    return handlebars.compile(`
      <h1>{{subject}}</h1>
      <p>Hello {{name}},</p>
      <p>{{message}}</p>
      <p>Thank you,<br>The AI Video Team</p>
    `);
  }
};

// Send a generic email
const sendEmail = async (to, subject, template, context) => {
  try {
    const mailOptions = {
      from: `"AI Video" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: template(context)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/* 
 * Subscription Notification Emails
 */

// Send subscription cancellation confirmation
const sendSubscriptionCancellationEmail = async (to, data) => {
  try {
    const template = loadTemplate('subscription-cancelled');
    const context = {
      subject: 'Your Subscription Has Been Cancelled',
      name: data.name,
      planName: data.planName,
      endDate: data.endDate,
      message: `Your ${data.planName} plan subscription has been cancelled. You'll continue to have access until ${new Date(data.endDate).toLocaleDateString()}.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error: error.message };
  }
};

// Send upcoming renewal notification
const sendUpcomingRenewalEmail = async (to, data) => {
  try {
    const template = loadTemplate('upcoming-renewal');
    const context = {
      subject: `Your Subscription Renews in ${data.daysUntilRenewal} Days`,
      name: data.name,
      planName: data.planName,
      amount: data.amount,
      renewalDate: data.renewalDate,
      billingCycle: data.billingCycle,
      daysUntilRenewal: data.daysUntilRenewal,
      message: `Your ${data.planName} plan subscription will renew automatically on ${new Date(data.renewalDate).toLocaleDateString()}.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending renewal notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment success email
const sendPaymentSuccessEmail = async (to, data) => {
  try {
    const template = loadTemplate('payment-success');
    const context = {
      subject: 'Payment Successfully Processed',
      name: data.name,
      planName: data.planName,
      amount: data.amount,
      date: data.date,
      transactionId: data.transactionId || 'Not provided',
      message: `Your payment of $${data.amount} for the ${data.planName} plan was successfully processed.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment failure email
const sendPaymentFailureEmail = async (to, data) => {
  try {
    const template = loadTemplate('payment-failed');
    const context = {
      subject: 'Payment Failure Notice',
      name: data.name,
      planName: data.planName,
      amount: data.amount,
      date: data.date,
      errorMessage: data.errorMessage || 'The payment could not be processed.',
      message: `We were unable to process your payment of $${data.amount} for the ${data.planName} plan.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment retry success email
const sendPaymentRetrySuccessEmail = async (to, data) => {
  try {
    const template = loadTemplate('payment-retry-success');
    const context = {
      subject: 'Payment Successfully Processed',
      name: data.name,
      planName: data.planName,
      amount: data.amount,
      date: data.date,
      message: `Good news! We've successfully processed your previously failed payment of $${data.amount} for the ${data.planName} plan.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending payment retry success email:', error);
    return { success: false, error: error.message };
  }
};

// Send final payment failure email
const sendPaymentFinalFailureEmail = async (to, data) => {
  try {
    const template = loadTemplate('payment-final-failure');
    const context = {
      subject: 'Action Required: Payment Failed',
      name: data.name,
      planName: data.planName,
      amount: data.amount,
      date: data.date,
      message: `We've attempted to process your payment of $${data.amount} for the ${data.planName} plan multiple times without success. Please update your payment information to avoid service interruption.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending final payment failure email:', error);
    return { success: false, error: error.message };
  }
};

// Send subscription expiration notice
const sendSubscriptionExpirationEmail = async (to, data) => {
  try {
    const template = loadTemplate('subscription-expired');
    const context = {
      subject: 'Your Subscription Has Expired',
      name: data.name,
      planName: data.planName,
      expirationDate: data.expirationDate,
      message: `Your ${data.planName} plan subscription has expired as of ${new Date(data.expirationDate).toLocaleDateString()}.`
    };
    
    return await sendEmail(to, context.subject, template, context);
  } catch (error) {
    console.error('Error sending expiration email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendSubscriptionCancellationEmail,
  sendUpcomingRenewalEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailureEmail,
  sendPaymentRetrySuccessEmail,
  sendPaymentFinalFailureEmail,
  sendSubscriptionExpirationEmail
}; 