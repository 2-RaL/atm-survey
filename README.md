# SorğuPro — Sorğu, zəng mərkəzi və analitika platforması

**Versiya:** 1.1.0 — Hostinger ZIP deployment  
**Dil:** Azərbaycan dili  
**Texnologiya:** Node.js 20/22/24, HTML5, CSS3, Vanilla JavaScript  
**Quraşdırılmalı əlavə npm paketi:** **0**

SorğuPro telefon vasitəsilə aparılan ictimai rəy, məmnuniyyət və təşkilati araşdırmalar üçün tam veb interfeysə malik işlək tətbiqdir. Administrator sorğunu qurur, respondentləri bazaya yükləyir, operatorlara tapşırıqlar verir. Operator zəng edərək cavabları bölmələr üzrə daxil edir, zəngin nəticəsini qeyd edir, yarımçıq formanı qaralama şəklində saxlayır. Administrator nəticələri təhlil edir və CSV formasında ixrac edir.

## 1. İşə salma

**Tələb:** Node.js **20, 22 və ya 24** (22 tövsiyə edilir).

```bash
# Arxivdən çıxarılmış qovluğa daxil olun
cd SorguPro_Hostinger_Ready

# Lokal demo üçün .env kopyalamayın; .env.example production nümunəsidir.
# Serveri işə salın — npm install tələb olunmur
npm start
```

Brauzerdə **http://localhost:3000** açın. Lokal test rejimində ilk işə salmada `data/db.json` yaradılır və demo sorğular, respondentlər və əməkdaşlar avtomatik formalaşır. **Hostinger production rejimində isə yalnız administrator hesabı yaradılır**; demo operatorlar və respondentlər əlavə olunmur. Növbəti başladılmalarda mövcud baza saxlanılır.

### Demo giriş məlumatları

| Rol | İstifadəçi adı | Şifrə |
|---|---|---|
| Administrator | `admin` | `1234567890` |
| Redaktor | `redaktor1` | `1234567890` |
| Operator 1 | `operator1` | `1234567890` |
| Operator 2 | `operator2` | `1234567890` |

**Vacib:** Bu məlumatlar yalnız demo məqsədlidir. Production rejimində həmin demo hesablar yaradılmır; Hostinger üçün ayrıca təhlükəsiz ADMIN_PASSWORD tələb olunur. `ADMIN_PASSWORD` mühit dəyişəni **yalnız baza ilk dəfə yaradılarkən** nəzərə alınır. Mövcud hesaba sonradan şifrə dəyişilməsi veb interfeysdən aparılmalıdır.

## 2. İmkanlar

### Administrator
- Sorğu konstruktoru: sual yaratma, redaktə, kopyalama, yuxarı-aşağı keçirmə, silmə.
- Bölmələr üzrə sorğu hazırlanması və sualların bölmələrə təyini.
- Cavaba əsaslanan **şərtli göstərilmə** (bərabərdir, bərabər deyil, ehtiva edir, boşdur, boş deyil).
- Məcburi suallar, seçim variantları, rəqəm intervalı, slider addımı, çoxlu seçim limiti.
- Sorğu statusları: qaralama, aktiv, dayandırılıb, arxiv.
- Sorğuların sürətli surətinin yaradılması, redaktorun önizlənməsi.
- Respondent yaratma, redaktə, CSV-dən kütləvi idxal.
- Operatorlara sorğu-respondent tapşırıqlarının verilməsi və prioritetləşdirilməsi.
- Operator hesabı yaratma, rol idarəsi, deaktivləşdirmə, şifrə sıfırlama.
- Hesabatlarda sual üzrə cavab bölgüsü, orta bal, dinamik göstəricilər, cavab reyestri.
- UTF-8 BOM ilə **Excel-ə uyğun CSV ixracı**.

### Operator
- Fərdi tapşırıq siyahısı və status filtrləri.
- Respondentin əlaqə məlumatı, zəngə keçid (`tel:`), zəng tarixçəsi.
- Nəticə kodları: gözləyir, davam edir, təkrar zəng, cavab vermədi, məşğul, imtina etdi, tamamlandı.
- Təkrar zəng tarixi və operator qeydləri.
- Bütün sual tipləri üzrə interaktiv müsahibə forması və bölmə göstəricisi.
- **Qaralama saxlanması**, cavabların bərpası, tamamlanmış müsahibənin dəyişdirilmədən baxışı.
- Məcburi sualların və bəzi mürəkkəb formaların server tərəfində yoxlanması.
- Zəng/müsahibə müddətinin izlənməsi.

### 32 sorğu sual modulu

**Seçim:** Tək seçim, Çoxlu seçim, Açılan siyahı, Bəli/Xeyr, Şəkillə seçim.

**Qiymətləndirmə:** Reytinq şkalası, Ulduz reytinqi, Slider, Sıralama, Ən yaxşı/ən pis, Matris/reyting cədvəli, Çoxseçimli matris, Açılan menyulu matris, NPS, Likert şkalası.

**Mətn və rəqəm:** Qısa mətn, Şərh/geniş mətn, Rəqəm, Məbləğ (AZN), Faiz, Çoxlu mətn sahəsi.

**Şəxsi məlumatlar:** Ad-soyad, E-poçt, Telefon, Ünvan, Tarix, Saat, Tarix və saat, Fayl yükləmə.

**Digər:** Razılıq, Mətn A/B testi, Şəkil A/B testi.

A/B variantları respondent təyinatına görə deterministik seçilir və nəticələrdə variant–cavab cütlüyü hesablana bilər. Fayllar maksimum 2 MB olmalıdır (JPG, PNG, WebP, PDF, DOCX).

## 3. Administratorun iş axını

1. `Sorğular` → `Yeni sorğu yarat` düyməsini açın.
2. Konstruktorun sol panelindən sual modullarını seçin; sualları və şərtləri sağ paneldə sazlayın.
3. `Məlumatlar` bölməsində sorğunu `Aktiv` edin və `Yadda saxla` basın.
4. `Respondentlər` səhifəsinə keçin. Siyahını fərdi əlavə edin və ya CSV faylından idxal edin.
5. Respondentləri seçin → `Sorğuya təyin et` → sorğu və operator seçin.
6. Operatorlar öz hesablarına daxil olduqda tapşırıqları `Zəng tapşırıqları` bölməsində görür.
7. Müsahibələr tamamlandıqca `Hesabatlar` bölməsində analitik göstəricilər yenilənir.

### CSV idxal formatı

`example_contacts.csv` nümunəsini açın. UTF-8 CSV faylında ad/telefon üçün bu başlıqlar dəstəklənir:

- `fullName`, `phone` (mütləq);
- `region`, `email`, `notes` (istəyə bağlı).

Həm vergül, həm də nöqtəli vergüllə ayrılan CSV-lər dəstəklənir. İlk sətir başlıq sətri olmalıdır.

## 4. Hosting / Hostinger Node.js

**Bu versiya Hostinger ZIP upload üçün hazırdır.** ZIP kökündə `package.json` və `app.js` yerləşir. Deploy zamanı **Framework: Other**, **Node: 22**, **Entry file: app.js**, **Start: npm start**, **Build: npm run build** seçin. Hostinger-in **Websites → Add website / Create website → Node.js Web App → Upload your website files** bölməsində yükləyin.

**Əsas şərt:** hPanel-də `NODE_ENV=production`, `SEED_DEMO=false`, `ADMIN_USERNAME=admin` və unikal 12+ simvolluq `ADMIN_PASSWORD` təyin edin. Hostinger deploy qovluqları dəyişdiyi üçün `DATA_DIR` ilə qalıcı qovluq konfiqurasiyası vacibdir. Yeni Hostinger qovluq strukturu aşkar edildikdə tətbiq layihənin yanında sabit `sorgupro-private-data` qovluğunu seçməyə çalışır; bunu serverin real fayl icazələrində yoxlayın.

**Bütün mərhələlər, ekran dəyərləri, problemlər və sabit məlumat qovluğu barədə:** [`HOSTINGER_QURASDIRMA.md`](HOSTINGER_QURASDIRMA.md).

## 5. Məlumat bazası və ehtiyat nüsxə

Tətbiq quraşdırma asanlığı üçün **asılılıqsız, tək Node.js prosesi üzrə sinxron, atomik yazılan JSON məlumat bazası** istifadə edir. Əsas fayl: `DATA_DIR/db.json`; yükləmələr: `DATA_DIR/uploads/`.

Bu quruluş az və orta həcmli daxili pilot layihə üçün uyğundur. **Çoxsaylı paralel proses, böyük operator komandası və kritik istehsalat yükləri** üçün sonrakı mərhələdə PostgreSQL kimi tranzaksiyalı verilənlər bazasına keçid tövsiyə olunur. Bu layihəni **birdən artıq Node prosesi** eyni `DATA_DIR` ilə işə salmayın: sinxron yazma təminatı yalnız **tək server prosesi** çərçivəsindədir.

`db.json` və `uploads/` qovluğunun planlı ehtiyat nüsxəsini alın, ehtiyatları şifrəli və girişə nəzarət edilən yerdə saxlayın. Real respondent məlumatları üçün tətbiqin yerləşdiriləcəyi serverin təhlükəsizlik və şəxsi məlumatların qorunması siyasətlərini qiymətləndirin.

## 6. Təhlükəsizlik qeydləri

- Şifrələr düz mətn şəklində deyil, **Node `crypto.scrypt`** ilə salt edilərək saxlanılır.
- Sessiyalar server tərəfində saxlanır, cookie `HttpOnly` və `SameSite=Strict` ilə yaradılır; HTTPS olduqda `Secure` istifadə olunur.
- Administrator/operator rolları server səviyyəsində yoxlanılır.
- JSON sorğuları, ölçü həddi, başlanğıc login sürət məhdudlaşdırması, təhlükəsizlik HTTP başlıqları və origin nəzarəti var.
- **İstehsalat rejimində demo giriş hesabları yaradılmır; lokal demo şifrələrini internetdə yayımlamayın.** HTTPS və müntəzəm ehtiyat nüsxələr tələb olunur.
- Sistem zəngin **real audio bağlantısını yaratmır və yazmır**. `tel:` düyməsi telefonda və ya uyğun kompüter proqramında zəng interfeysini açır. Birbaşa VoIP/CRM/avtomatik zəng üçün ayrıca provayder API inteqrasiyası lazımdır.
- Real məlumatların toplanmasına başlamazdan əvvəl müvafiq razılıq, məlumat saxlanması və məxfiliyə dair hüquqi tələblərə əməl edin.

## 6.1. Ölçü Vahidləri, Rəqəm və Mətn Meyarları (Validasya Sistemi)

Konstruktorun sağ tərəfindəki **"Sual Parametrləri"** panelindən suallara xüsusi ölçü vahidləri və meyarlar tətbiq olunur:

1. **Ölçü Vahidləri və Rəqəm Hədləri:**
   - **Vahidlər:** `kq (kiloqram)`, `ton`, `q (qram)`, `mq`, `litr`, `ml`, `m³`, `metr`, `sm`, `km`, `mm`, `m²`, `ha`, `ədəd`, `nəfər`, `qutu`, `dəst`, `kisə`, `AZN (₼)`, `USD ($)`, `EUR (€)`, `% (faiz)`, `dəqiqə`, `saat`, `gün`, `ay`, `il` və ya fərdi xüsusi vahid.
   - **Minimum və Maksimum Hədlər:** Məsələn, ton seçilərkən `Minimum: 1000` təyin oluna bilər; bu halda 1000-dən aşağı dəyər daxil edilməsinə icazə verilmir.
   - **Vizual göstərici:** Suallarda daxiletmə sahəsinin yanında ölçü vahidi nişanı və dərhal altında tələb olunan minimum/maksimum hədlər əyani şəkildə görünür.

2. **Hərf və Mətn Meyarları:**
   - **Yalnız hərflər:** Ad, soyad, region üçün — rəqəm və xüsusi simvollar qadağan edilir.
   - **Böyük hərflərlə məcburi (CAPITAL):** Bütün hərflərin böyük daxil olunması tələb edilir.
   - **Azərbaycan mobil nömrəsi:** `+994` və ya `050`, `051`, `055`, `070`, `077`, `099`, `010` prefiksləri ilə düzgün mobil nömrə formatı tələb edilir.
   - **E-poçt formatı:** Standart `ad@domain.com` strukturu yoxlanılır.
   - **FİN kod:** 7 simvollu şəxsiyyət vəsiqəsi FİN kodu tələbi.
   - **VÖEN:** 10 rəqəmli vergi ödəyicisi nömrəsi tələbi.
   - **Simvol və Söz Sayı Hədləri:** Minimum/maksimum simvol sayı və minimum söz sayı tələbi (məs: geniş rəy üçün ən azı 3 söz).
   - **Fərdi xəbərdarlıq mesajı:** Şərt ödənmədikdə respondentə və ya operatora aydın şəkildə göstərilən xüsusi bildiriş mətni.

## 7. Testlər

```bash
npm test
```

`node:test` üzərində qurulmuş inteqrasiya testi müstəqil müvəqqəti bazada giriş, rol icazələri, sorğu yaratma, respondent təyini, server validasiyası, qaralama, cavab tamamlama, CSV ixracı və hesabatı yoxlayır. Heç bir əlavə paket quraşdırılmır.

---

**Layihə quruluşu**

```text
SorguPro_Hostinger_Ready/
├── app.js               # Hostinger entry file
├── HOSTINGER_QURASDIRMA.md
├── public/
│   ├── index.html        # Brauzer tətbiqi
│   ├── style.css         # Responsive premium interfeys
│   ├── app.js            # Sorğu redaktoru, müsahibə və analitika
│   └── favicon.svg
├── server/
│   ├── server.js         # REST API, autentifikasiya və veb server
│   ├── store.js          # Data saxlanması
│   └── seed.js           # Demo məlumatların ilkin yaradılması
├── tests/
│   ├── api.test.js       # İnteqrasiya testi
│   └── hostinger.test.js # Hostinger redeploy/persistence testi
├── data/                 # İş zamanı yaradılan baza və yükləmələr
├── scripts/              # Build yoxlaması
├── example_contacts.csv # CSV nümunəsi
├── .env.example          # Konfiqurasiya nümunəsi
└── package.json
```
