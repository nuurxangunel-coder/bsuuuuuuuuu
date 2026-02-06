# 🚀 Render.com Deployment Təlimatları

## 1️⃣ PostgreSQL Database Quraşdırılması

### Addım 1: PostgreSQL Database yaradın
1. [Render Dashboard](https://dashboard.render.com/) açın
2. **New** → **PostgreSQL** seçin
3. Konfiqurasiya:
   - **Name:** bsu-chat-db
   - **Database:** data_base_qzzz (və ya istənilən ad)
   - **User:** Avtomatik yaradılacaq
   - **Region:** Oregon (və ya ən yaxın region)
   - **Plan:** Free (və ya istədiyiniz plan)
4. **Create Database** düyməsini basın

### Addım 2: Database məlumatlarını kopyalayın
Database yarandıqdan sonra:
1. **Internal Database URL** və ya **External Database URL** kopyalayın
2. Format: `postgresql://user:password@host:5432/database`

## 2️⃣ Web Service Quraşdırılması

### Addım 1: Web Service yaradın
1. Render Dashboard-da **New** → **Web Service**
2. GitHub repository seçin: `nuurxangunel-coder/bsuuuuuuuuu`
3. **Connect** düyməsini basın

### Addım 2: Service konfiqurasiyası
```
Name: bsu-chat
Region: Oregon (və ya yaxın region)
Branch: main
Root Directory: (boş buraxın)
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free (və ya istənilən plan)
```

### Addım 3: Environment Variables
**Environment** bölməsində aşağıdakı dəyişənləri əlavə edin:

```env
NODE_ENV=production
SESSION_SECRET=bsu-chat-secret-production-2025-random-string
DATABASE_URL=<Addım 1.2-dən aldığınız PostgreSQL URL>
```

**Qeyd:** `SESSION_SECRET` üçün güclü random string istifadə edin

### Addım 4: Deploy
1. **Create Web Service** düyməsini basın
2. Deploy prosesi başlayacaq (5-10 dəqiqə)
3. Logs-da bu mesajları gözləyin:
   ```
   ✅ Database connected successfully
   ✅ Database initialized successfully!
   ✅ Server is running on port 10000
   ```

## 3️⃣ Deploy-dan sonra yoxlama

### Service URL-ni tapın
Deploy tamamlandıqdan sonra:
1. Service səhifəsində yuxarıda sizin URL görsənəcək
2. Format: `https://bsu-chat-XXXX.onrender.com`
3. Bu URL-ə daxil olun

### İlk giriş (Super Admin)
1. **Admin Paneli** tabına keçin
2. Credentials:
   - **Username:** 618ursamajor618
   - **Password:** majorursa618
3. Daxil olun və admin panelini test edin

### Test istifadəçi yaradın
1. **Qeydiyyat** tabına keçin
2. Test məlumatları:
   - **Ad Soyad:** Test İstifadəçi
   - **Telefon:** +994501234567
   - **Email:** test@bsu.edu.az
   - **Fakültə:** İstənilən fakültə
   - **Dərəcə:** Bakalavr
   - **Kurs:** 3
   - **Avatar:** Seçin
3. Doğrulama suallarını cavablandırın
4. Qeydiyyatdan keçin

## 4️⃣ Troubleshooting

### Problem: Database connection error
**Həll:**
1. `DATABASE_URL` environment variable düzgün?
2. PostgreSQL database aktiv?
3. Service və database eyni region-da?

### Problem: Session issues
**Həll:**
1. `SESSION_SECRET` konfiqurasiya olunub?
2. Database-də `session` table yaradılıb? (avtomatik yaradılmalıdır)

### Problem: 503 Service Unavailable
**Həll:**
1. Render free plan-da 15 dəqiqə inactivity-dən sonra sleep mode
2. İlk request 30-60 saniyə gözləyin (cold start)

### Problem: Database initialization failed
**Həll:**
1. Logs-u yoxlayın: Deploy logs-da hər hansı SQL error?
2. Əgər error varsa, Render PostgreSQL console-dan manual run edin:
   ```sql
   -- schema.sql-dən SQL komandaları kopyalayın və run edin
   ```

## 5️⃣ Custom Domain (Optional)

### Addım 1: Domain əlavə edin
1. Service Settings → Custom Domains
2. **Add Custom Domain** düyməsini basın
3. Domain-inizi daxil edin (məs: chat.bsu.edu.az)

### Addım 2: DNS konfiqurasiyası
1. Domain provider-da CNAME record yaradın:
   ```
   Type: CNAME
   Name: chat
   Value: bsu-chat-XXXX.onrender.com
   ```
2. SSL certificate avtomatik yaradılacaq

## 6️⃣ Auto-Deploy Konfiqurasiyası

Render avtomatik olaraq GitHub-dan hər push-da deploy edir:
1. Service Settings → Build & Deploy
2. **Auto-Deploy:** Yes (default)
3. İndi hər dəfə GitHub-a push etdiyinizdə avtomatik deploy olacaq

## 7️⃣ Monitoring & Logs

### Logs görüntüləmək
1. Service Dashboard → Logs
2. Real-time logs görsənəcək

### Metrics
1. Service Dashboard → Metrics
2. CPU, Memory, Request statistics

## ✅ Deploy Checklist

- [ ] PostgreSQL database yaradıldı
- [ ] Database URL kopyalandı
- [ ] Web Service yaradıldı
- [ ] Environment variables konfiqurasiya olundu
- [ ] Deploy uğurla tamamlandı
- [ ] Service URL açılır
- [ ] Super admin girişi işləyir
- [ ] Test istifadəçi qeydiyyatı işləyir
- [ ] Chat otaqları işləyir
- [ ] Şəxsi mesajlaşma işləyir
- [ ] Admin paneli tam funksionaldır

## 📊 Gözlənilən URL-lər

- **Web Service:** https://bsu-chat-XXXX.onrender.com
- **GitHub Repo:** https://github.com/nuurxangunel-coder/bsuuuuuuuuu
- **PostgreSQL:** Internal URL (Render tərəfindən təmin edilir)

## 🎉 Deploy Tamamlandı!

Təbriklər! BSU Chat platforması artıq canlı və işləyir. İstifadəçilər qeydiyyatdan keçə və chat edə bilərlər.

**Qeyd:** Render free plan-da:
- 750 saat/ay free (kifayətdir)
- 15 dəqiqə inactivity sonra sleep
- İlk request yavaş ola bilər (cold start)

Daha çox performans üçün paid plan-a keçə bilərsiniz.
