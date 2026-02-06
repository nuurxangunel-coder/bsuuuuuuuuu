# BSU Chat - Bakı Dövlət Universiteti Tələbə Chat Platforması

## 📋 Layihə Haqqında

BSU Chat - Bakı Dövlət Universitetinin tələbələri üçün nəzərdə tutulmuş real-time chat platformasıdır. 16 fakültə üçün ayrı-ayrı chat otaqları, şəxsi mesajlaşma, admin paneli və təhlükəsizlik xüsusiyyətləri ilə təchiz edilmişdir.

## ✨ Əsas Xüsusiyyətlər

### Tələbə Xüsusiyyətləri
- ✅ BSU email (@bsu.edu.az) ilə qeydiyyat
- ✅ Telefon nömrəsi ilə qeydiyyat (+994XXXXXXXXX)
- ✅ Doğrulama sualları (korpus məlumatları)
- ✅ 16 fakültə üçün ayrı chat otaqları
- ✅ Şəxsi mesajlaşma sistemi
- ✅ İstifadəçiləri əngəlləmə
- ✅ İstifadəçiləri şikayət etmə
- ✅ Profil redaktəsi
- ✅ Avatar seçimi (oğlan/qız)

### 16 Fakültə
1. Mexanika-riyaziyyat fakültəsi
2. Tətbiqi riyaziyyat və kibernetika fakültəsi
3. Fizika fakültəsi
4. Kimya fakültəsi
5. Biologiya fakültəsi
6. Ekologiya və torpaqşünaslıq fakültəsi
7. Coğrafiya fakültəsi
8. Geologiya fakültəsi
9. Filologiya fakültəsi
10. Tarix fakültəsi
11. Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi
12. Hüquq fakültəsi
13. Jurnalistika fakültəsi
14. İnformasiya və sənəd menecmenti fakültəsi
15. Şərqşünaslıq fakültəsi
16. Sosial elmlər və psixologiya fakültəsi

### Admin Paneli
- ✅ İstifadəçi idarəetməsi (aktiv/deaktiv)
- ✅ Günün mövzusu
- ✅ Qaydalar idarəetməsi
- ✅ Haqqında məlumat
- ✅ Filtr sözləri (auto-censorship)
- ✅ Mesaj avtomatik silinmə vaxtı
- ✅ Şikayət edilmiş hesablar (8+ şikayət)
- ✅ Alt admin yaratma/silmə (super admin)

### Super Admin Credentials
- **Username:** 618ursamajor618
- **Password:** majorursa618

## 🛠 Texnologiyalar

### Backend
- Node.js
- Express.js
- Socket.IO (real-time messaging)
- PostgreSQL (Render database)
- bcryptjs (password hashing)
- express-session (session management)

### Frontend
- HTML5
- CSS3 (Gradient design)
- Vanilla JavaScript
- Socket.IO Client

## 🚀 Quraşdırma

### 1. Repository-ni klonlayın
```bash
git clone https://github.com/nuurxangunel-coder/bsuuuuuuuuu.git
cd bsuuuuuuuuu
```

### 2. Dependencies-ləri quraşdırın
```bash
npm install
```

### 3. Environment variables
`.env` faylı yaradın:
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-secret-key
DATABASE_URL=postgresql://username:password@host:5432/database
```

### 4. Server-i işə salın
```bash
npm start
```

## 📦 Deployment (Render.com)

### Render Web Service
1. GitHub repository-ni Render.com-a bağlayın
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. **Environment Variables:**
   - `NODE_ENV=production`
   - `DATABASE_URL` (Render PostgreSQL-dən alın)
   - `SESSION_SECRET` (random string)

### Render PostgreSQL
1. Render-də PostgreSQL database yaradın
2. **Internal/External Database URL**-ni kopyalayın
3. Web Service environment variables-ə əlavə edin
4. Database avtomatik initialize olacaq ilk deploy zamanı

## 🗃 Database Strukturu

### Users Table
- id, full_name, phone, email, password
- faculty, degree, course, avatar
- is_active, created_at

### Group Messages Table
- id, faculty, user_id, message, created_at

### Private Messages Table  
- id, sender_id, receiver_id, message, created_at

### Admins Table
- id, username, password, is_super_admin, created_at

### Blocked Users Table
- id, blocker_id, blocked_id, created_at

### Reports Table
- id, reporter_id, reported_id, created_at

### Settings Table
- id, key, value, updated_at

## 🔒 Təhlükəsizlik

- ✅ Password hashing (bcrypt)
- ✅ Session-based authentication
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (HTML escaping)
- ✅ CORS configuration
- ✅ SSL/TLS (Render)
- ✅ Email domain validation (@bsu.edu.az)
- ✅ Verification questions

## 📱 İstifadə

### Tələbə Qeydiyyatı
1. Qeydiyyat tabına keçin
2. Ad, soyad, telefon (+994XXXXXXXXX) daxil edin
3. BSU email-ini daxil edin (prefix@bsu.edu.az)
4. Fakültə, dərəcə, kurs seçin
5. Avatar seçin (oğlan/qız)
6. Doğrulama suallarını cavablandırın (ən azı 2 düzgün)
7. Qeydiyyatdan keçin

### Giriş
1. Email və şifrə daxil edin
2. Doğrulama suallarını cavablandırın
3. Daxil olun

### Chat
1. Sol paneldən fakültəni seçin
2. Mesaj yazın və göndərin
3. Digər istifadəçilərin mesajında ⋮ düyməsinə basaraq:
   - Şəxsi mesaj göndərin
   - Əngəlləyin
   - Şikayət edin

### Admin Panel
1. Admin Paneli tabına keçin
2. Super admin credentials ilə giriş edin
3. İstifadəçiləri idarə edin
4. Tənzimləmələri dəyişin

## 🎨 Dizayn Xüsusiyyətləri

- Gradient background (purple theme)
- Modern card-based UI
- Rounded corners
- Smooth animations
- Responsive design
- Clean typography
- Avatar system

## 🕒 Mesaj Silinmə

Admin panelində konfiqurasiya olunan avtomatik mesaj silinmə:
- **Qrup mesajları:** Default 2 saat
- **Şəxsi mesajlar:** Default 2 saat
- Hər saat background job işləyir

## 📊 Statistika

- İstifadəçi sayı (admin panelində)
- Şikayət sayı (hər istifadəçi üçün)
- 8+ şikayəti olan istifadəçilər avtomatik siyahıya düşür

## 🐛 Troubleshooting

### Database connection error
- `DATABASE_URL` düzgün konfiqurasiya olunub?
- Render PostgreSQL servisi aktiv?
- SSL certificate problemi varsa `rejectUnauthorized: false` istifadə edin

### Session issues
- `SESSION_SECRET` konfiqurasiya olunub?
- PostgreSQL-də `session` table yaradılıb?

### Socket.IO disconnect
- CORS konfiqurasiyasını yoxlayın
- Port 3000 açıq?

## 📝 License

MIT

## 👨‍💻 Developer

Developed for Baku State University students

## 📞 Dəstək

Issues və feature requests üçün GitHub Issues istifadə edin.

---

**Note:** Bu layihə Bakı Dövlət Universitetinin tələbələri üçün nəzərdə tutulmuşdur. Qeydiyyat zamanı yalnız @bsu.edu.az domain-i qəbul edilir.
