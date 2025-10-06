# 🔒 Complete Security Guide - Hosting Your Cryptocurrency Exchange

## 🛡️ Why Security is Critical

Running a cryptocurrency exchange is like running a bank. You're handling people's money, so security is absolutely essential. This guide will teach you how to secure your exchange like a professional.

---

## 🎯 Security Checklist

### **✅ Server Security**
- [ ] Secure SSH access
- [ ] Configure firewall
- [ ] Install fail2ban
- [ ] Disable root login
- [ ] Use strong passwords
- [ ] Enable automatic updates

### **✅ Application Security**
- [ ] Use HTTPS (SSL certificates)
- [ ] Configure security headers
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Regular backups
- [ ] Input validation

### **✅ Database Security**
- [ ] Encrypt database connections
- [ ] Use strong database passwords
- [ ] Regular database backups
- [ ] Monitor database access
- [ ] Enable database logging

---

## 🔐 Step 1: Secure Your Server

### **1.1 Create a Non-Root User**

```bash
# Create new user
adduser cryptoadmin
usermod -aG sudo cryptoadmin

# Copy SSH key to new user
mkdir -p /home/cryptoadmin/.ssh
cp /root/.ssh/authorized_keys /home/cryptoadmin/.ssh/
chown -R cryptoadmin:cryptoadmin /home/cryptoadmin/.ssh
chmod 700 /home/cryptoadmin/.ssh
chmod 600 /home/cryptoadmin/.ssh/authorized_keys
```

### **1.2 Secure SSH Access**

```bash
# Edit SSH configuration
nano /etc/ssh/sshd_config
```

**Change these settings:**
```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

**Restart SSH:**
```bash
systemctl restart ssh
```

### **1.3 Configure Firewall**

```bash
# Install UFW
apt install -y ufw

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp  # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Exchange (temporary)

# Enable firewall
ufw enable

# Check status
ufw status
```

### **1.4 Install Fail2ban**

```bash
# Install fail2ban
apt install -y fail2ban

# Configure fail2ban
nano /etc/fail2ban/jail.local
```

**Add this configuration:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
```

**Start fail2ban:**
```bash
systemctl start fail2ban
systemctl enable fail2ban
```

---

## 🔒 Step 2: Secure Your Application

### **2.1 Setup SSL Certificate (HTTPS)**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
certbot renew --dry-run
```

### **2.2 Configure Security Headers**

```bash
# Edit Nginx configuration
nano /etc/nginx/sites-available/crypto-exchange
```

**Add these security headers:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **2.3 Configure Application Security**

```bash
# Edit environment file
nano /var/www/coinbase-clone/.env
```

**Add these security settings:**
```env
# Security Configuration
NODE_ENV=production
TRUST_PROXY=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Security
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Encryption
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY=your_32_character_encryption_key_here

# JWT Security
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Database Security
POSTGRES_SSL=true
MONGO_SSL=true
REDIS_SSL=true
```

---

## 🗄️ Step 3: Secure Your Databases

### **3.1 PostgreSQL Security**

```bash
# Edit PostgreSQL configuration
nano /etc/postgresql/13/main/postgresql.conf
```

**Add these settings:**
```
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
log_connections = on
log_disconnections = on
log_statement = 'all'
```

**Edit authentication:**
```bash
nano /etc/postgresql/13/main/pg_hba.conf
```

**Change to:**
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

**Restart PostgreSQL:**
```bash
systemctl restart postgresql
```

### **3.2 MongoDB Security**

```bash
# Edit MongoDB configuration
nano /etc/mongod.conf
```

**Add these settings:**
```yaml
security:
  authorization: enabled

net:
  port: 27017
  bindIp: 127.0.0.1

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
```

**Create admin user:**
```bash
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
exit
```

**Restart MongoDB:**
```bash
systemctl restart mongod
```

### **3.3 Redis Security**

```bash
# Edit Redis configuration
nano /etc/redis/redis.conf
```

**Add these settings:**
```
requirepass your_secure_redis_password
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60
maxmemory 256mb
maxmemory-policy allkeys-lru
```

**Restart Redis:**
```bash
systemctl restart redis
```

---

## 📊 Step 4: Setup Monitoring and Logging

### **4.1 Install Monitoring Tools**

```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Install log monitoring
apt install -y logwatch

# Install security monitoring
apt install -y aide rkhunter chkrootkit
```

### **4.2 Configure Log Monitoring**

```bash
# Configure logwatch
nano /etc/logwatch/conf/logwatch.conf
```

**Add these settings:**
```
LogDir = /var/log
TmpDir = /var/cache/logwatch
MailTo = your-email@example.com
MailFrom = security@yourdomain.com
Detail = Med
Service = All
Format = html
Encode = none
```

### **4.3 Setup Security Monitoring**

```bash
# Configure AIDE (file integrity monitoring)
aideinit
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Setup daily security checks
nano /etc/cron.daily/security-check
```

**Add this script:**
```bash
#!/bin/bash
# Security monitoring script

# Check for rootkits
rkhunter --check --skip-keypress

# Check file integrity
aide --check

# Check for failed login attempts
grep "Failed password" /var/log/auth.log | tail -10

# Check disk space
df -h | awk '$5 > 80 {print $0}'

# Check memory usage
free -h | awk 'NR==2{if($3/$2 > 0.8) print "High memory usage: " $3/$2*100 "%"}'
```

**Make it executable:**
```bash
chmod +x /etc/cron.daily/security-check
```

---

## 🔄 Step 5: Setup Automated Backups

### **5.1 Database Backups**

```bash
# Create backup script
nano /var/www/coinbase-clone/backup.sh
```

**Add this script:**
```bash
#!/bin/bash
# Database backup script

BACKUP_DIR="/var/backups/crypto-exchange"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -h localhost -U coinbase_user -d coinbase_clone > $BACKUP_DIR/postgres_$DATE.sql

# Backup MongoDB
mongodump --host localhost --port 27017 --db coinbase-clone --out $BACKUP_DIR/mongodb_$DATE

# Backup Redis
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/coinbase-clone

# Remove old backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

# Upload to cloud storage (optional)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/
```

**Make it executable:**
```bash
chmod +x /var/www/coinbase-clone/backup.sh
```

**Setup daily backups:**
```bash
# Add to crontab
crontab -e
```

**Add this line:**
```
0 2 * * * /var/www/coinbase-clone/backup.sh
```

### **5.2 Test Backups**

```bash
# Test backup script
/var/www/coinbase-clone/backup.sh

# Check if backups were created
ls -la /var/backups/crypto-exchange/
```

---

## 🚨 Step 6: Setup Alerts and Notifications

### **6.1 Install Email Tools**

```bash
# Install mail tools
apt install -y mailutils postfix

# Configure postfix
dpkg-reconfigure postfix
```

### **6.2 Create Alert Script**

```bash
# Create alert script
nano /var/www/coinbase-clone/alerts.sh
```

**Add this script:**
```bash
#!/bin/bash
# Security alert script

ALERT_EMAIL="your-email@example.com"
SERVER_NAME="crypto-exchange"

# Check if exchange is running
if ! pm2 list | grep -q "crypto-exchange.*online"; then
    echo "ALERT: Exchange is down on $SERVER_NAME" | mail -s "Exchange Down Alert" $ALERT_EMAIL
    pm2 restart crypto-exchange
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERT: Disk space is ${DISK_USAGE}% on $SERVER_NAME" | mail -s "Disk Space Alert" $ALERT_EMAIL
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "ALERT: Memory usage is ${MEMORY_USAGE}% on $SERVER_NAME" | mail -s "Memory Alert" $ALERT_EMAIL
fi

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "ALERT: $FAILED_LOGINS failed login attempts on $SERVER_NAME" | mail -s "Security Alert" $ALERT_EMAIL
fi
```

**Make it executable:**
```bash
chmod +x /var/www/coinbase-clone/alerts.sh
```

**Setup alerts to run every 5 minutes:**
```bash
# Add to crontab
crontab -e
```

**Add this line:**
```
*/5 * * * * /var/www/coinbase-clone/alerts.sh
```

---

## 🔍 Step 7: Security Testing

### **7.1 Test Your Security**

```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test firewall
nmap -p 22,80,443 yourdomain.com

# Test rate limiting
for i in {1..10}; do curl -X POST https://yourdomain.com/api/auth/login; done

# Test security headers
curl -I https://yourdomain.com
```

### **7.2 Security Audit**

```bash
# Run security audit
apt install -y lynis
lynis audit system

# Check for vulnerabilities
apt install -y unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

---

## 📋 Security Checklist

### **✅ Server Security**
- [ ] Non-root user created
- [ ] SSH secured (port 2222, no root login)
- [ ] Firewall configured
- [ ] Fail2ban installed
- [ ] Automatic updates enabled
- [ ] Strong passwords set

### **✅ Application Security**
- [ ] HTTPS enabled (SSL certificate)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Session security configured
- [ ] CORS properly configured

### **✅ Database Security**
- [ ] Database passwords changed
- [ ] SSL connections enabled
- [ ] Database logging enabled
- [ ] Regular backups configured
- [ ] Database access restricted

### **✅ Monitoring & Alerts**
- [ ] Log monitoring configured
- [ ] Security monitoring enabled
- [ ] Automated backups setup
- [ ] Alert notifications configured
- [ ] Performance monitoring enabled

### **✅ Testing & Maintenance**
- [ ] Security testing completed
- [ ] Vulnerability scan run
- [ ] Backup restoration tested
- [ ] Incident response plan ready
- [ ] Security documentation updated

---

## 🚨 Emergency Response Plan

### **If Your Exchange is Compromised:**

1. **Immediately:**
   - Change all passwords
   - Disable compromised accounts
   - Check logs for suspicious activity
   - Notify users if necessary

2. **Investigate:**
   - Check system logs
   - Review database access
   - Check for unauthorized changes
   - Document everything

3. **Recover:**
   - Restore from clean backup
   - Update all software
   - Review security measures
   - Implement additional protections

4. **Prevent:**
   - Update security procedures
   - Train staff on security
   - Implement additional monitoring
   - Regular security audits

---

## 📚 Additional Security Resources

### **Security Tools:**
- **Nmap**: Network scanning
- **Lynis**: Security auditing
- **AIDE**: File integrity monitoring
- **RKHunter**: Rootkit detection
- **ChkRootkit**: Rootkit detection

### **Security Websites:**
- **OWASP**: https://owasp.org
- **CVE Database**: https://cve.mitre.org
- **Security Advisories**: https://security.ubuntu.com

### **Security Best Practices:**
- Regular security updates
- Strong password policies
- Multi-factor authentication
- Regular security audits
- Incident response planning

---

## 🎉 Congratulations!

### **Your Exchange is Now Secure!**

You've implemented:
- ✅ **Server-level security** (SSH, firewall, fail2ban)
- ✅ **Application security** (HTTPS, headers, rate limiting)
- ✅ **Database security** (encryption, access control)
- ✅ **Monitoring and alerts** (automated monitoring)
- ✅ **Backup and recovery** (automated backups)
- ✅ **Security testing** (vulnerability scanning)

### **Remember:**
- Security is an ongoing process
- Regular updates and monitoring are essential
- Test your security measures regularly
- Keep documentation updated
- Train your team on security procedures

---

**Your cryptocurrency exchange is now secure and ready for production! 🔒🚀**

*Remember: Security is not a one-time setup - it's an ongoing commitment to protecting your users and their assets.*