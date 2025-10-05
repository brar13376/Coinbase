# 🔧 Troubleshooting Guide - Coinbase Clone Exchange

## Common Issues and Solutions

### 🚨 **Database Connection Issues**

#### Problem: "Cannot connect to PostgreSQL"
**Symptoms:**
- Error: `ECONNREFUSED` or `Connection refused`
- Database initialization fails

**Solutions:**
1. **Check if PostgreSQL is running:**
   ```bash
   # Windows
   services.msc → Look for PostgreSQL service
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Start PostgreSQL:**
   ```bash
   # Windows
   net start postgresql-x64-13
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

3. **Check connection settings in .env:**
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   ```

#### Problem: "MongoDB connection failed"
**Solutions:**
1. **Start MongoDB:**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb
   
   # Linux
   sudo systemctl start mongod
   ```

2. **Check MongoDB logs:**
   ```bash
   # Linux
   sudo journalctl -u mongod
   ```

#### Problem: "Redis connection failed"
**Solutions:**
1. **Start Redis:**
   ```bash
   # Windows
   redis-server
   
   # macOS
   brew services start redis
   
   # Linux
   sudo systemctl start redis
   ```

2. **Test Redis connection:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

---

### 🚨 **Port Already in Use**

#### Problem: "Port 3000 is already in use"
**Solutions:**
1. **Find what's using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # macOS/Linux
   lsof -i :3000
   ```

2. **Kill the process:**
   ```bash
   # Windows
   taskkill /PID <process_id> /F
   
   # macOS/Linux
   kill -9 <process_id>
   ```

3. **Or change the port in .env:**
   ```env
   PORT=3001
   ```

---

### 🚨 **Permission Denied Errors**

#### Problem: "EACCES: permission denied"
**Solutions:**
1. **Fix npm permissions:**
   ```bash
   # macOS/Linux
   sudo chown -R $(whoami) ~/.npm
   ```

2. **Use npx instead of npm:**
   ```bash
   npx create-react-app my-app
   ```

3. **Run with sudo (not recommended):**
   ```bash
   sudo npm install
   ```

---

### 🚨 **Node.js Version Issues**

#### Problem: "Node version not supported"
**Solutions:**
1. **Check Node version:**
   ```bash
   node --version
   ```

2. **Install Node 18+:**
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   
   # Or download from nodejs.org
   ```

3. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

---

### 🚨 **Docker Issues**

#### Problem: "Docker not running"
**Solutions:**
1. **Start Docker Desktop:**
   - Windows: Start Docker Desktop app
   - macOS: Start Docker Desktop app
   - Linux: `sudo systemctl start docker`

2. **Check Docker status:**
   ```bash
   docker --version
   docker ps
   ```

3. **Restart Docker:**
   ```bash
   # Windows/macOS: Restart Docker Desktop
   # Linux
   sudo systemctl restart docker
   ```

---

### 🚨 **Memory Issues**

#### Problem: "JavaScript heap out of memory"
**Solutions:**
1. **Increase Node memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run dev
   ```

2. **Or add to package.json:**
   ```json
   {
     "scripts": {
       "dev": "NODE_OPTIONS='--max-old-space-size=4096' concurrently ..."
     }
   }
   ```

---

### 🚨 **SSL Certificate Issues**

#### Problem: "SSL certificate verification failed"
**Solutions:**
1. **Disable SSL verification (development only):**
   ```bash
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

2. **Or update certificates:**
   ```bash
   # macOS
   brew install ca-certificates
   
   # Linux
   sudo apt-get update && sudo apt-get install ca-certificates
   ```

---

### 🚨 **API Key Issues**

#### Problem: "Invalid API key"
**Solutions:**
1. **Check .env file:**
   ```env
   BINANCE_API_KEY=your_actual_key_here
   BINANCE_API_SECRET=your_actual_secret_here
   ```

2. **Verify API keys are active:**
   - Log into Binance/Coinbase
   - Check API key status
   - Regenerate if needed

3. **Check API permissions:**
   - Ensure trading permissions are enabled
   - Check IP restrictions

---

### 🚨 **Build Errors**

#### Problem: "Module not found"
**Solutions:**
1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check file paths:**
   - Ensure all imports are correct
   - Check case sensitivity

3. **Update dependencies:**
   ```bash
   npm update
   ```

---

### 🚨 **Database Schema Issues**

#### Problem: "Table doesn't exist"
**Solutions:**
1. **Re-run database initialization:**
   ```bash
   node database/install.js
   ```

2. **Check database connection:**
   ```bash
   psql -h localhost -U postgres -d coinbase_clone
   ```

3. **Verify SQL script execution:**
   - Check database logs
   - Manually run SQL commands

---

### 🚨 **WebSocket Connection Issues**

#### Problem: "WebSocket connection failed"
**Solutions:**
1. **Check if ports are open:**
   ```bash
   # Check if port 3000 is listening
   netstat -tulpn | grep :3000
   ```

2. **Disable firewall temporarily:**
   ```bash
   # Windows
   netsh advfirewall set allprofiles state off
   
   # Linux
   sudo ufw disable
   ```

3. **Check CORS settings:**
   ```javascript
   // In your server config
   cors: {
     origin: ['http://localhost:3000'],
     credentials: true
   }
   ```

---

### 🚨 **Performance Issues**

#### Problem: "Slow loading or timeouts"
**Solutions:**
1. **Check system resources:**
   ```bash
   # Check memory usage
   free -h
   
   # Check CPU usage
   top
   ```

2. **Optimize database queries:**
   - Add indexes
   - Check query performance
   - Use connection pooling

3. **Increase timeouts:**
   ```javascript
   // In your server config
   timeout: 30000,
   keepAlive: true
   ```

---

### 🚨 **Environment Variable Issues**

#### Problem: "Environment variable not found"
**Solutions:**
1. **Check .env file exists:**
   ```bash
   ls -la .env
   ```

2. **Verify variable names:**
   ```env
   # Correct format
   VARIABLE_NAME=value
   
   # No spaces around =
   # No quotes unless needed
   ```

3. **Restart the application:**
   ```bash
   # Stop and restart
   Ctrl+C
   npm run dev
   ```

---

### 🚨 **Log Analysis**

#### How to Read Logs:
1. **Check application logs:**
   ```bash
   tail -f logs/combined.log
   ```

2. **Check error logs:**
   ```bash
   tail -f logs/error.log
   ```

3. **Check database logs:**
   ```bash
   # PostgreSQL
   tail -f /var/log/postgresql/postgresql-13-main.log
   
   # MongoDB
   tail -f /var/log/mongodb/mongod.log
   ```

---

### 🚨 **Getting Help**

#### Before Asking for Help:
1. **Check the logs** for error messages
2. **Verify all prerequisites** are installed
3. **Try the solutions** in this guide
4. **Search existing issues** on GitHub

#### When Reporting Issues:
1. **Include error messages** (full stack trace)
2. **Specify your operating system** and version
3. **List steps to reproduce** the problem
4. **Attach relevant log files**

#### Useful Commands for Debugging:
```bash
# Check all running processes
ps aux | grep node

# Check port usage
netstat -tulpn | grep :3000

# Check disk space
df -h

# Check memory usage
free -h

# Check system logs
journalctl -f
```

---

### 🚨 **Emergency Reset**

#### If Everything is Broken:
1. **Stop all services:**
   ```bash
   # Stop Node.js processes
   pkill -f node
   
   # Stop databases
   sudo systemctl stop postgresql mongod redis
   ```

2. **Clean everything:**
   ```bash
   # Remove node_modules
   rm -rf node_modules package-lock.json
   
   # Remove database data (WARNING: This deletes all data!)
   sudo rm -rf /var/lib/postgresql/data
   sudo rm -rf /var/lib/mongodb/data
   ```

3. **Start fresh:**
   ```bash
   # Reinstall everything
   npm install
   node database/install-all.js
   npm run dev
   ```

---

**Remember: Most issues are solved by checking logs, restarting services, or reinstalling dependencies! 🔧**