# 🌐 Cloudflare DNS Setup for boomroach.wales

## 🏴󠁧󠁢󠁷󠁬󠁳󠁿 BoomRoach Wales - DNS Configuration Guide

### 📋 **DNS Records Configuration**

#### **A Records (IPv4)**
```
Type: A
Name: @
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: www
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: app
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: api
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: admin
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: dashboard
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: metrics
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: traefik
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: A
Name: bot
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)
```

#### **CNAME Records**
```
Type: CNAME
Name: hydra
Content: api.boomroach.wales
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: CNAME
Name: trading
Content: api.boomroach.wales
TTL: Auto
Proxy: ✅ Proxied (Orange Cloud)

Type: CNAME
Name: ws
Content: api.boomroach.wales
TTL: Auto
Proxy: ❌ DNS Only (Grey Cloud) - For WebSocket
```

#### **MX Records (Email)**
```
Type: MX
Name: @
Content: mx1.forwardemail.net
Priority: 10
TTL: Auto

Type: MX
Name: @
Content: mx2.forwardemail.net
Priority: 20
TTL: Auto
```

#### **TXT Records (Email Authentication)**
```
Type: TXT
Name: @
Content: v=spf1 include:sendgrid.net include:_spf.google.com ~all
TTL: Auto

Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@boomroach.wales
TTL: Auto

Type: TXT
Name: default._domainkey
Content: [DKIM_KEY_FROM_SENDGRID]
TTL: Auto

Type: TXT
Name: @
Content: boomroach-wales-verification=[VERIFICATION_CODE]
TTL: Auto
```

---

## 🔧 **Cloudflare Configuration Settings**

### 🔒 **SSL/TLS Settings**
```
SSL/TLS Mode: Full (Strict)
Edge Certificates: On
Always Use HTTPS: On
HTTP Strict Transport Security (HSTS): Enabled
- Max Age Header: 12 months
- Include Subdomains: On
- Preload: On
Minimum TLS Version: 1.2
Opportunistic Encryption: On
TLS 1.3: On
Automatic HTTPS Rewrites: On
Certificate Transparency Monitoring: On
```

### ⚡ **Speed Optimization**
```
Auto Minify:
- JavaScript: On
- CSS: On
- HTML: On

Brotli: On
Early Hints: On
HTTP/2: On
HTTP/3 (with QUIC): On
0-RTT Connection Resumption: On

Caching Level: Standard
Browser Cache TTL: 1 month
Development Mode: Off (for production)

Polish: Lossless
Mirage: On
Rocket Loader: Off (for trading platform stability)
```

### 🛡️ **Security Settings**
```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
Privacy Pass Support: On

Bot Fight Mode: On
Super Bot Fight Mode: On (if available)

WAF (Web Application Firewall):
- Managed Rules: On
- Rate Limiting: Custom rules for API protection

DDoS Protection: Automatic
IP Geolocation: On
```

### 🌍 **Network Settings**
```
IP Geolocation: On
IPv6 Compatibility: On
WebSockets: On
Pseudo IPv4: Add header
HTTP/2 Server Push: Off
gRPC: On
```

---

## 🔐 **Advanced Security Rules**

### **Rate Limiting Rules**
```javascript
// API Rate Limiting
Rule 1: API Protection
- Expression: (http.request.uri.path contains "/api/")
- Rate: 100 requests per minute
- Action: Block
- Duration: 10 minutes

Rule 2: Trading Endpoints
- Expression: (http.request.uri.path contains "/api/trading/")
- Rate: 50 requests per minute
- Action: Block
- Duration: 5 minutes

Rule 3: Authentication Endpoints
- Expression: (http.request.uri.path contains "/api/auth/")
- Rate: 10 requests per minute
- Action: Block
- Duration: 15 minutes
```

### **WAF Custom Rules**
```javascript
// Block malicious requests
Rule 1: SQL Injection Protection
- Expression: (http.request.body contains "union select" or http.request.body contains "' or 1=1")
- Action: Block

Rule 2: XSS Protection
- Expression: (http.request.body contains "<script" or http.request.uri.query contains "<script")
- Action: Block

Rule 3: Admin Panel Protection
- Expression: (http.request.uri.path contains "/admin" and ip.geoip.country ne "GB")
- Action: Challenge
```

### **Firewall Rules**
```javascript
// Geographic restrictions for admin
Rule 1: Admin Geographic Restriction
- Expression: (http.request.uri.path contains "/admin" and ip.geoip.country not in {"GB" "US" "FR"})
- Action: Block

// Allow known good bots
Rule 2: Search Engine Bots
- Expression: (cf.client.bot)
- Action: Allow

// Block known bad countries for trading
Rule 3: Trading Geographic Filter
- Expression: (http.request.uri.path contains "/api/trading" and ip.geoip.country in {"CN" "RU" "KP"})
- Action: Block
```

---

## 📈 **Page Rules Configuration**

### **Caching Rules**
```
Rule 1: Static Assets Caching
- URL: *.boomroach.wales/static/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month

Rule 2: API No Cache
- URL: *.boomroach.wales/api/*
- Cache Level: Bypass

Rule 3: Admin Panel Security
- URL: admin.boomroach.wales/*
- Security Level: High
- Cache Level: Bypass
- Disable Apps: On

Rule 4: WebSocket Bypass
- URL: ws.boomroach.wales/*
- Cache Level: Bypass
- Disable Performance: On
```

---

## 🔧 **Environment Configuration Update**

### **Production Environment (.env.production)**
```bash
# Domain Configuration
DOMAIN=boomroach.wales
ACME_EMAIL=admin@boomroach.wales

# Cloudflare Integration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_EMAIL=your_cloudflare_email

# SSL Configuration
SSL_PROVIDER=cloudflare
FORCE_HTTPS=true

# CDN Configuration
CDN_URL=https://boomroach.wales
STATIC_ASSETS_URL=https://boomroach.wales/static

# CORS Origins
CORS_ORIGINS=https://boomroach.wales,https://www.boomroach.wales,https://app.boomroach.wales,https://admin.boomroach.wales

# API URLs
NEXT_PUBLIC_API_URL=https://api.boomroach.wales
NEXT_PUBLIC_WS_URL=wss://ws.boomroach.wales
NEXT_PUBLIC_DOMAIN=boomroach.wales

# Telegram Configuration
TELEGRAM_WEBHOOK_URL=https://api.boomroach.wales/api/telegram/webhook
```

---

## 🚀 **Deployment Steps**

### **Step 1: DNS Propagation Check**
```bash
# Check DNS propagation
dig @8.8.8.8 boomroach.wales
dig @8.8.8.8 app.boomroach.wales
dig @8.8.8.8 api.boomroach.wales

# Test all subdomains
for subdomain in www app api admin dashboard metrics traefik bot; do
  echo "Testing $subdomain.boomroach.wales"
  dig @8.8.8.8 $subdomain.boomroach.wales
done
```

### **Step 2: SSL Certificate Verification**
```bash
# Check SSL certificates
openssl s_client -connect boomroach.wales:443 -servername boomroach.wales
openssl s_client -connect app.boomroach.wales:443 -servername app.boomroach.wales
openssl s_client -connect api.boomroach.wales:443 -servername api.boomroach.wales
```

### **Step 3: Cloudflare API Integration**
```bash
# Test Cloudflare API access
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"

# Purge cache for deployment
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 📊 **Monitoring & Analytics**

### **Cloudflare Analytics Setup**
```javascript
// Web Analytics
Analytics: On
Bot Analytics: On
Security Analytics: On

// Custom Events for Trading Platform
Event 1: Trading Execution
- Name: trade_executed
- Properties: token, amount, strategy

Event 2: User Registration
- Name: user_registered
- Properties: country, referrer

Event 3: Bot Interaction
- Name: telegram_command
- Properties: command, user_id
```

### **Performance Monitoring**
```bash
# Create monitoring script
#!/bin/bash
# cloudflare-monitoring.sh

ENDPOINTS=(
  "https://boomroach.wales"
  "https://app.boomroach.wales"
  "https://api.boomroach.wales/health"
  "https://admin.boomroach.wales"
)

for endpoint in "${ENDPOINTS[@]}"; do
  response_time=$(curl -s -w "%{time_total}" -o /dev/null "$endpoint")
  echo "$endpoint: ${response_time}s"
done
```

---

## 🎯 **Success Verification Checklist**

### ✅ **DNS Configuration**
- [ ] All A records pointing to server IP
- [ ] Cloudflare proxy enabled for web traffic
- [ ] WebSocket CNAME configured (DNS only)
- [ ] MX records for email configured
- [ ] TXT records for SPF/DKIM/DMARC

### ✅ **SSL/TLS Configuration**
- [ ] Full (Strict) SSL mode enabled
- [ ] HSTS configured with preload
- [ ] All subdomains SSL verified
- [ ] Automatic HTTPS redirects working

### ✅ **Security Configuration**
- [ ] WAF rules active and tested
- [ ] Rate limiting configured
- [ ] DDoS protection enabled
- [ ] Geographic restrictions applied

### ✅ **Performance Configuration**
- [ ] CDN caching optimized
- [ ] Auto minification enabled
- [ ] HTTP/3 and Brotli enabled
- [ ] WebSocket support verified

### ✅ **Monitoring Setup**
- [ ] Analytics tracking configured
- [ ] Performance monitoring active
- [ ] Security alerts configured
- [ ] Uptime monitoring enabled

**🏴󠁧󠁢󠁷󠁬󠁳󠁿 BOOMROACH WALES DNS CONFIGURATION COMPLETE! 🏴󠁧󠁢󠁷󠁬󠁳󠁿**
