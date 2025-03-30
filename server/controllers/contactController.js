const nodemailer = require('nodemailer');

// @desc    Submit contact form
// @route   POST /api/contact/submit
// @access  Public
const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validate inputs
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Save message to database or log (always works even if email fails)
    console.log('Contact form submission:', {
      name,
      email,
      subject,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });
    
    // Try to send email if credentials are provided
    let emailSent = false;
    
    if (process.env.EMAIL_PASSWORD) {
      try {
        // Configure nodemailer transporter
        const transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'lingligantz@gmail.com',
            pass: process.env.EMAIL_PASSWORD
          }
        });

        // Email to the support team
        const mailOptions = {
          from: `"AI Video Contact Form" <${process.env.EMAIL_USER || 'lingligantz@gmail.com'}>`,
          to: process.env.SUPPORT_EMAIL || 'lingligantz@gmail.com',
          subject: `Support Request: ${subject}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
        
        // Check if this is a Gmail auth error
        if (emailError.code === 'EAUTH' && emailError.responseCode === 534) {
          console.error('Gmail requires an App Password. Regular password won\'t work.');
        }
        
        // Don't return error to client - we'll still consider the submission successful
        // since we logged the message
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? 'Your message has been received. We will get back to you soon!'
        : 'Your message has been received. Our team monitors these submissions regularly.',
      emailSent
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit your message. Please try again later.'
    });
  }
};

module.exports = {
  submitContactForm
}; 