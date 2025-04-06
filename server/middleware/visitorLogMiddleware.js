const VisitorLog = require('../models/VisitorLog');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid');

/**
 * Visitor logging middleware
 * 
 * Tracks users who visit the website with:
 * - IP address (anonymized for privacy)
 * - User agent information
 * - Timestamp (in EST timezone)
 * - Location data from IP
 * - User ID if authenticated
 */
const logVisitor = async (req, res, next) => {
  try {
    // Skip logging for static assets and API health checks
    if (
      req.path.match(/\.(css|js|ico|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/i) ||
      req.path === '/api/health' ||
      req.path === '/favicon.ico'
    ) {
      return next();
    }

    // Get IP address
    const ipAddress = getIpAddress(req);
    const anonymizedIp = anonymizeIp(ipAddress);
    
    // Get or create session ID from cookie
    const sessionId = getOrCreateSessionId(req, res);
    
    // Parse user agent
    const parser = new UAParser(req.headers['user-agent']);
    const userAgentInfo = {
      browser: parser.getBrowser().name,
      version: parser.getBrowser().version,
      os: parser.getOS().name,
      device: parser.getDevice().type || 'desktop',
      fullString: req.headers['user-agent']
    };
    
    // Get location info from IP
    const geo = geoip.lookup(ipAddress);
    const location = geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone
    } : null;

    // Check if this IP already exists in our logs
    const existingVisitor = await VisitorLog.findOne({ ipAddress: anonymizedIp });
    
    if (existingVisitor) {
      // Update the existing record instead of creating a new one
      existingVisitor.timestamp = new Date(); // Update timestamp to current time
      existingVisitor.userId = req.user ? req.user._id : existingVisitor.userId;
      existingVisitor.isAuthenticated = !!req.user || existingVisitor.isAuthenticated;
      existingVisitor.path = req.path;
      existingVisitor.referrer = req.headers.referer || existingVisitor.referrer;
      existingVisitor.sessionId = sessionId;
      
      // Save the updated record
      existingVisitor.save().catch(err => {
        console.error('Error updating visitor log:', err);
      });
    } else {
      // Create a new visitor log entry
      const visitorLog = new VisitorLog({
        ipAddress: anonymizedIp,
        userAgent: userAgentInfo,
        timestamp: new Date(),
        userId: req.user ? req.user._id : null,
        isAuthenticated: !!req.user,
        path: req.path,
        referrer: req.headers.referer || null,
        sessionId,
        location
      });

      // Save log in the background - don't wait for completion
      visitorLog.save().catch(err => {
        console.error('Error saving visitor log:', err);
      });
    }

    // Continue with the request
    next();
  } catch (error) {
    console.error('Error in visitor logging middleware:', error);
    // Continue with the request even if logging fails
    next();
  }
};

/**
 * Get the client's IP address from the request
 */
const getIpAddress = (req) => {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Get the first IP in the list (client IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to direct connection IP
  return req.ip || req.connection.remoteAddress || '0.0.0.0';
};

/**
 * Anonymize IP address for privacy (mask last octet)
 */
const anonymizeIp = (ip) => {
  if (!ip) return '0.0.0.0';
  
  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // Handle IPv6 (simplistic approach - for better IPv6 anonymization, use a specialized library)
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + ':0000:0000:0000:0000';
  }
  
  return ip;
};

/**
 * Get existing session ID from cookie or create a new one
 */
const getOrCreateSessionId = (req, res) => {
  const sessionCookieName = 'visitor_session_id';
  
  // Check if session ID exists in cookie
  if (req.cookies && req.cookies[sessionCookieName]) {
    return req.cookies[sessionCookieName];
  }
  
  // Create new session ID
  const sessionId = uuidv4();
  
  // Set cookie that expires in 30 minutes
  res.cookie(sessionCookieName, sessionId, {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  return sessionId;
};

module.exports = { logVisitor }; 