require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database initialization function
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Initializing database...');
    
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        faculty VARCHAR(255) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        course INTEGER NOT NULL CHECK (course >= 1 AND course <= 6),
        avatar INTEGER DEFAULT 1 CHECK (avatar IN (1, 2)),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_super_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create blocked_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id SERIAL PRIMARY KEY,
        blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(blocker_id, blocked_id)
      )
    `);
    
    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create group_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        faculty VARCHAR(255) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create private_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS private_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_messages_faculty ON group_messages(faculty)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id)');
    
    // Insert super admin with hashed password
    const hashedPassword = await bcrypt.hash('majorursa618', 10);
    await client.query(
      `INSERT INTO admins (username, password, is_super_admin) 
       VALUES ($1, $2, true) 
       ON CONFLICT (username) DO UPDATE SET password = $2`,
      ['618ursamajor618', hashedPassword]
    );
    
    // Insert default settings
    const settings = [
      ['rules', 'Qaydalar buraya əlavə ediləcək'],
      ['about', 'Haqqında buraya əlavə ediləcək'],
      ['topic_of_day', ''],
      ['filter_words', ''],
      ['group_message_lifetime_hours', '2'],
      ['private_message_lifetime_hours', '2']
    ];
    
    for (const [key, value] of settings) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [key, value]
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');
    console.log('✅ Super Admin: 618ursamajor618 / majorursa618');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
  }
}

// Test database connection and initialize
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
    await initializeDatabase();
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'bsu-chat-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // Allow HTTP for Render.com
    sameSite: 'lax'
  }
});

app.use(sessionMiddleware);

// Share session with Socket.IO - Improved version
io.engine.use(sessionMiddleware);

// Helper function to get Baku time
function getBakuTime() {
  return moment().tz('Asia/Baku').format('YYYY-MM-DD HH:mm:ss');
}

// Helper function to filter bad words
async function filterMessage(message) {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', ['filter_words']);
    if (result.rows.length > 0 && result.rows[0].value) {
      const badWords = result.rows[0].value.split(',').map(w => w.trim()).filter(w => w);
      let filteredMessage = message;
      badWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
      });
      return filteredMessage;
    }
  } catch (error) {
    console.error('Error filtering message:', error);
  }
  return message;
}

// Verification questions and answers
const verificationQuestions = [
  { q: 'Mexanika-riyaziyyat fakültəsi hansı korpusda yerləşir?', a: '3', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Tətbiqi riyaziyyat və kibernetika fakültəsi hansı korpusda yerləşir?', a: '3', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Fizika fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Kimya fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Biologiya fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Ekologiya və torpaqşünaslıq fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Coğrafiya fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Geologiya fakültəsi hansı korpusda yerləşir?', a: 'əsas korpus', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Filologiya fakültəsi hansı korpusda yerləşir?', a: '1', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Tarix fakültəsi hansı korpusda yerləşir?', a: '3', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi hansı korpusda yerləşir?', a: '1', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Hüquq fakültəsi hansı korpusda yerləşir?', a: '1', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Jurnalistika fakültəsi hansı korpusda yerləşir?', a: '2', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'İnformasiya və sənəd menecmenti fakültəsi hansı korpusda yerləşir?', a: '2', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Şərqşünaslıq fakültəsi hansı korpusda yerləşir?', a: '2', options: ['1', '2', '3', 'əsas korpus'] },
  { q: 'Sosial elmlər və psixologiya fakültəsi hansı korpusda yerləşir?', a: '2', options: ['1', '2', '3', 'əsas korpus'] }
];

// API Routes

// Get random verification questions
app.post('/api/get-verification-questions', (req, res) => {
  const shuffled = [...verificationQuestions].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  res.json({ questions: selected });
});

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { full_name, phone, email, password, faculty, degree, course, avatar, answers } = req.body;

    // Validate required fields
    if (!full_name || !phone || !email || !password || !faculty || !degree || !course || !avatar) {
      return res.status(400).json({ success: false, message: 'Bütün xanaları doldurun' });
    }

    // Validate phone format
    if (!phone.startsWith('+994') || phone.length !== 13) {
      return res.status(400).json({ success: false, message: 'Nömrə formatı: +994XXXXXXXXX' });
    }

    // Validate email
    if (!email.endsWith('@bsu.edu.az')) {
      return res.status(400).json({ success: false, message: 'Email @bsu.edu.az ilə bitməlidir' });
    }

    // Validate course
    if (course < 1 || course > 6) {
      return res.status(400).json({ success: false, message: 'Kurs 1-6 arasında olmalıdır' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1 OR email = $2',
      [phone, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Bu nömrə və ya email artıq istifadə olunub' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (full_name, phone, email, password, faculty, degree, course, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [full_name, phone, email, hashedPassword, faculty, degree, course, avatar]
    );

    res.json({ success: true, message: 'Qeydiyyat uğurlu!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, answers } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email və şifrə daxil edin' });
    }

    // Get user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'İstifadəçi tapılmadı' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Hesabınız deaktiv edilib' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Yanlış şifrə' });
    }

    // Verify answers (at least 2 out of 3 correct)
    if (answers && answers.length === 3) {
      let correctCount = 0;
      answers.forEach((answer, index) => {
        const question = verificationQuestions.find(q => q.q === answer.question);
        if (question && question.a === answer.answer) {
          correctCount++;
        }
      });

      if (correctCount < 2) {
        return res.status(400).json({ success: false, message: 'Doğrulama uğursuz! Ən azı 2 sual düzgün cavablandırılmalıdır' });
      }
    }

    // Set session
    req.session.userId = user.id;
    req.session.userType = 'user';

    // Return user data (without password)
    const userData = {
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      faculty: user.faculty,
      degree: user.degree,
      course: user.course,
      avatar: user.avatar
    };

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'İstifadəçi adı və şifrə daxil edin' });
    }

    // Get admin
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Admin tapılmadı' });
    }

    const admin = result.rows[0];

    // For super admin, use plain text comparison
    if (admin.is_super_admin && username === '618ursamajor618' && password === 'majorursa618') {
      req.session.adminId = admin.id;
      req.session.userType = 'admin';
      req.session.isSuperAdmin = true;

      return res.json({
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          is_super_admin: admin.is_super_admin
        }
      });
    }

    // For other admins, check hashed password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Yanlış şifrə' });
    }

    req.session.adminId = admin.id;
    req.session.userType = 'admin';
    req.session.isSuperAdmin = admin.is_super_admin;

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        is_super_admin: admin.is_super_admin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Check session
app.get('/api/check-session', (req, res) => {
  if (req.session.userId) {
    pool.query('SELECT id, full_name, phone, email, faculty, degree, course, avatar FROM users WHERE id = $1', [req.session.userId])
      .then(result => {
        if (result.rows.length > 0) {
          res.json({ loggedIn: true, userType: 'user', user: result.rows[0] });
        } else {
          res.json({ loggedIn: false });
        }
      })
      .catch(error => {
        console.error('Session check error:', error);
        res.json({ loggedIn: false });
      });
  } else if (req.session.adminId) {
    pool.query('SELECT id, username, is_super_admin FROM admins WHERE id = $1', [req.session.adminId])
      .then(result => {
        if (result.rows.length > 0) {
          res.json({ loggedIn: true, userType: 'admin', admin: result.rows[0] });
        } else {
          res.json({ loggedIn: false });
        }
      })
      .catch(error => {
        console.error('Session check error:', error);
        res.json({ loggedIn: false });
      });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Xəta baş verdi' });
    }
    res.json({ success: true });
  });
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Update settings (admin only)
app.post('/api/admin/settings', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const { key, value } = req.body;

    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
      [key, value]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const result = await pool.query(
      'SELECT id, full_name, phone, email, faculty, degree, course, avatar, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    // Get report counts for each user
    const reportCounts = await pool.query(
      'SELECT reported_id, COUNT(*) as count FROM reports GROUP BY reported_id'
    );

    const reportCountMap = {};
    reportCounts.rows.forEach(row => {
      reportCountMap[row.reported_id] = parseInt(row.count);
    });

    const users = result.rows.map(user => ({
      ...user,
      report_count: reportCountMap[user.id] || 0
    }));

    res.json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Toggle user active status (admin only)
app.post('/api/admin/users/:id/toggle-active', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const userId = req.params.id;

    await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Get sub-admins (super admin only)
app.get('/api/admin/sub-admins', async (req, res) => {
  try {
    if (!req.session.adminId || !req.session.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const result = await pool.query(
      'SELECT id, username, created_at FROM admins WHERE is_super_admin = false ORDER BY created_at DESC'
    );

    res.json({ success: true, admins: result.rows });
  } catch (error) {
    console.error('Get sub-admins error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Create sub-admin (super admin only)
app.post('/api/admin/sub-admins', async (req, res) => {
  try {
    if (!req.session.adminId || !req.session.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'İstifadəçi adı və şifrə daxil edin' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO admins (username, password, is_super_admin) VALUES ($1, $2, false)',
      [username, hashedPassword]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq mövcuddur' });
    }
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Delete sub-admin (super admin only)
app.delete('/api/admin/sub-admins/:id', async (req, res) => {
  try {
    if (!req.session.adminId || !req.session.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Yetki yoxdur' });
    }

    const adminId = req.params.id;

    await pool.query('DELETE FROM admins WHERE id = $1 AND is_super_admin = false', [adminId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Get group messages for a faculty
app.get('/api/messages/group/:faculty', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ success: false, message: 'Giriş edilməyib' });
    }

    const faculty = req.params.faculty;

    // Get blocked users
    const blockedResult = await pool.query(
      'SELECT blocked_id FROM blocked_users WHERE blocker_id = $1',
      [req.session.userId]
    );
    const blockedIds = blockedResult.rows.map(row => row.blocked_id);

    // Get messages
    let query = `
      SELECT gm.id, gm.message, gm.created_at, 
             u.id as user_id, u.full_name, u.faculty, u.degree, u.course, u.avatar
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.faculty = $1
    `;

    if (blockedIds.length > 0) {
      query += ` AND gm.user_id NOT IN (${blockedIds.join(',')})`;
    }

    query += ' ORDER BY gm.created_at ASC';

    const result = await pool.query(query, [faculty]);

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Get private messages between two users
app.get('/api/messages/private/:otherUserId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ success: false, message: 'Giriş edilməyib' });
    }

    const otherUserId = req.params.otherUserId;

    // Check if blocked
    const blockedCheck = await pool.query(
      'SELECT id FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [req.session.userId, otherUserId]
    );

    if (blockedCheck.rows.length > 0) {
      return res.json({ success: true, messages: [], blocked: true });
    }

    const result = await pool.query(
      `SELECT pm.id, pm.message, pm.created_at, pm.sender_id, pm.receiver_id,
              u.full_name, u.avatar
       FROM private_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE (pm.sender_id = $1 AND pm.receiver_id = $2) OR (pm.sender_id = $2 AND pm.receiver_id = $1)
       ORDER BY pm.created_at ASC`,
      [req.session.userId, otherUserId]
    );

    res.json({ success: true, messages: result.rows, blocked: false });
  } catch (error) {
    console.error('Get private messages error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Block/unblock user
app.post('/api/users/block/:userId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ success: false, message: 'Giriş edilməyib' });
    }

    const userId = req.params.userId;

    // Check if already blocked
    const existingBlock = await pool.query(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [req.session.userId, userId]
    );

    if (existingBlock.rows.length > 0) {
      // Unblock
      await pool.query(
        'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [req.session.userId, userId]
      );
      res.json({ success: true, blocked: false });
    } else {
      // Block
      await pool.query(
        'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2)',
        [req.session.userId, userId]
      );
      res.json({ success: true, blocked: true });
    }
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Report user
app.post('/api/users/report/:userId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ success: false, message: 'Giriş edilməyib' });
    }

    const userId = req.params.userId;

    await pool.query(
      'INSERT INTO reports (reporter_id, reported_id) VALUES ($1, $2)',
      [req.session.userId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Get user info
app.get('/api/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await pool.query(
      'SELECT id, full_name, faculty, degree, course, avatar FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Update user profile
app.post('/api/users/update-profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ success: false, message: 'Giriş edilməyib' });
    }

    const { full_name, faculty, degree, course } = req.body;

    await pool.query(
      'UPDATE users SET full_name = $1, faculty = $2, degree = $3, course = $4 WHERE id = $5',
      [full_name, faculty, degree, course, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Xəta baş verdi' });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  const session = socket.request.session;

  if (!session || !session.userId) {
    console.log('⚠️ Unauthorized socket connection - no session');
    return; // Don't disconnect immediately, wait for authentication
  }
  
  console.log('✅ Authenticated socket for user:', session.userId);

  // Join faculty room
  socket.on('join-faculty', async (faculty) => {
    try {
      socket.join(`faculty-${faculty}`);
      console.log(`👥 User ${session.userId} joined faculty: ${faculty}`);

      // Get user info
      const userResult = await pool.query(
        'SELECT id, full_name, faculty, degree, course, avatar FROM users WHERE id = $1',
        [session.userId]
      );

      if (userResult.rows.length > 0) {
        socket.to(`faculty-${faculty}`).emit('user-joined', {
          user: userResult.rows[0],
          time: getBakuTime()
        });
      }
    } catch (error) {
      console.error('❌ Join faculty error:', error);
    }
  });

  // Leave faculty room
  socket.on('leave-faculty', (faculty) => {
    socket.leave(`faculty-${faculty}`);
    console.log(`👋 User ${session.userId} left faculty: ${faculty}`);
  });

  // Send group message
  socket.on('send-group-message', async (data) => {
    try {
      const { faculty, message } = data;
      
      console.log('📨 Received group message:', { userId: session.userId, faculty, message: message.substring(0, 50) });

      if (!message || !faculty) {
        console.log('⚠️ Invalid message data');
        return;
      }

      // Check if user session is valid
      if (!session.userId) {
        console.log('⚠️ No userId in session');
        socket.emit('error', { message: 'Session expired, please login again' });
        return;
      }

      // Filter message
      const filteredMessage = await filterMessage(message);
      
      console.log('💾 Saving message to database...');

      // Save message
      const result = await pool.query(
        'INSERT INTO group_messages (faculty, user_id, message) VALUES ($1, $2, $3) RETURNING id, created_at',
        [faculty, session.userId, filteredMessage]
      );
      
      console.log('✅ Message saved with ID:', result.rows[0].id);

      // Get user info
      const userResult = await pool.query(
        'SELECT id, full_name, faculty, degree, course, avatar FROM users WHERE id = $1',
        [session.userId]
      );

      const messageData = {
        id: result.rows[0].id,
        message: filteredMessage,
        created_at: result.rows[0].created_at,
        user_id: session.userId,
        full_name: userResult.rows[0].full_name,
        faculty: userResult.rows[0].faculty,
        degree: userResult.rows[0].degree,
        course: userResult.rows[0].course,
        avatar: userResult.rows[0].avatar
      };

      // Broadcast to faculty room
      console.log('📡 Broadcasting to faculty:', faculty);
      io.to(`faculty-${faculty}`).emit('new-group-message', messageData);
      console.log('✅ Message broadcasted successfully');
    } catch (error) {
      console.error('Send group message error:', error);
    }
  });

  // Join private chat
  socket.on('join-private-chat', (otherUserId) => {
    const roomId = [session.userId, otherUserId].sort().join('-');
    socket.join(`private-${roomId}`);
    console.log(`User ${session.userId} joined private chat with ${otherUserId}`);
  });

  // Leave private chat
  socket.on('leave-private-chat', (otherUserId) => {
    const roomId = [session.userId, otherUserId].sort().join('-');
    socket.leave(`private-${roomId}`);
    console.log(`User ${session.userId} left private chat with ${otherUserId}`);
  });

  // Send private message
  socket.on('send-private-message', async (data) => {
    try {
      const { receiverId, message } = data;

      if (!message || !receiverId) {
        return;
      }

      // Check if blocked
      const blockedCheck = await pool.query(
        'SELECT id FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
        [session.userId, receiverId]
      );

      if (blockedCheck.rows.length > 0) {
        return;
      }

      // Filter message
      const filteredMessage = await filterMessage(message);

      // Save message
      const result = await pool.query(
        'INSERT INTO private_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING id, created_at',
        [session.userId, receiverId, filteredMessage]
      );

      // Get user info
      const userResult = await pool.query(
        'SELECT id, full_name, avatar FROM users WHERE id = $1',
        [session.userId]
      );

      const messageData = {
        id: result.rows[0].id,
        message: filteredMessage,
        created_at: result.rows[0].created_at,
        sender_id: session.userId,
        receiver_id: receiverId,
        full_name: userResult.rows[0].full_name,
        avatar: userResult.rows[0].avatar
      };

      // Send to both users
      const roomId = [session.userId, receiverId].sort().join('-');
      io.to(`private-${roomId}`).emit('new-private-message', messageData);
    } catch (error) {
      console.error('Send private message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Cleanup old messages
async function cleanupOldMessages() {
  try {
    // Get lifetime settings
    const settingsResult = await pool.query(
      'SELECT key, value FROM settings WHERE key IN ($1, $2)',
      ['group_message_lifetime_hours', 'private_message_lifetime_hours']
    );

    let groupLifetime = 2;
    let privateLifetime = 2;

    settingsResult.rows.forEach(row => {
      if (row.key === 'group_message_lifetime_hours') {
        groupLifetime = parseInt(row.value) || 2;
      } else if (row.key === 'private_message_lifetime_hours') {
        privateLifetime = parseInt(row.value) || 2;
      }
    });

    // Delete old group messages
    await pool.query(
      `DELETE FROM group_messages WHERE created_at < NOW() - INTERVAL '${groupLifetime} hours'`
    );

    // Delete old private messages
    await pool.query(
      `DELETE FROM private_messages WHERE created_at < NOW() - INTERVAL '${privateLifetime} hours'`
    );

    console.log('✅ Old messages cleaned up');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupOldMessages, 60 * 60 * 1000);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
