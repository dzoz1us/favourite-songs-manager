const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Логируем тело запроса для POST и PUT
  if (['POST', 'PUT'].includes(method) && req.body) {
    console.log(`[${timestamp}] Body:`, JSON.stringify(req.body));
  }
  
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '31' : // red
                        statusCode >= 400 ? '33' : // yellow
                        statusCode >= 300 ? '36' : // cyan
                        statusCode >= 200 ? '32' : // green
                        '0'; // reset
    
    console.log(`[${timestamp}] \x1b[${statusColor}m${statusCode}\x1b[0m ${method} ${url} - ${res.get('Content-Length') || 0} bytes`);
  });
  
  next();
};

module.exports = logger;