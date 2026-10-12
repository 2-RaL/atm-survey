# SorğuPro — Hostinger-də quraşdırma (1.1.0)

Bu ZIP **Hostinger Node.js Web App** xidmətinə birbaşa yüklənmək üçün hazırlanıb. PHP, WordPress, `public_html` daxilində HTML açılması və ya MySQL qurulması tələb olunmur. Bu, **Node.js server tətbiqidir**; yalnız `public/` qovluğunun FTP vasitəsilə yüklənməsi işləməyəcək.

## 1. Arxivi düzgün yükləyin

1. Hostinger **hPanel**-ə daxil olun → **Websites** → **Add website / Create website** → **Node.js Web App / Web App** seçin. Menyu adları interfeys versiyasına görə dəyişə bilər.
2. Domen (və ya əvvəlcə müvəqqəti domen) seçin.
3. **Upload your website files** seçin.
4. `SorguPro_Hostinger_READY.zip` faylını **arxivdən çıxarmadan** yükləyin.
5. ZIP-in **kökündə** `package.json` və `app.js` olmalıdır; kənardan əlavə qovluq seçməyə ehtiyac yoxdur.

## 2. Build / Start parametrləri

| Parametr | Dəyər |
|---|---|
| Framework | **Other** (əgər avtomatik təyin edilməyibsə) |
| Node.js | **22.x** (20.x və 24.x də uyğun) |
| Root directory | `.` |
| Entry file | `app.js` |
| Package manager | `npm` |
| Build command | `npm run build` (platforma komanda istəyirsə) |
| Start command | `npm start` (və ya `node app.js`) |
| Output directory | `.` (**yalnız məcburi tələb edilirsə**; bu frontend-only statik sayt deyil) |

Tətbiqdə xarici npm asılılığı yoxdur; `npm install` təhlükəsizdir, amma əlavə paket tələb olunmur. `PORT`-u Hostinger təyin edirsə, onu dəyişməyin. Server `0.0.0.0` ünvanını dinləyir.

## 3. Environment Variables — İLK DEPLOY ÜÇÜN VACİB

Hostinger-in **Environment Variables** sahəsində aşağıdakıları daxil edin:

```dotenv
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<özünüzün-yaratdığınız-unikal-12+-simvolluq-şifrə>
SEED_DEMO=false
```

`<...>` yazısını olduğu kimi saxlamayın. Minimum 12 simvolluq unikal şifrə yazın. Şifrəni heç vaxt saytda görünən faylda saxlamayın. **İlk dəfə məlumat bazası qurulmamışkən** ADMIN_PASSWORD daxil edilməsə, server təhlükəsizlik səbəbilə açılmır; Hostinger loglarında səbəb görünəcək. İlk bazadan sonra `ADMIN_PASSWORD` dəyişəni artıq mövcud administrator şifrəsini dəyişmir — onu istifadəçi interfeysindən dəyişmək lazımdır.

**Məlumatların qorunması (çox vacib)**: Hostinger hər deploy üçün yeni `hbuilds`/versiya qovluğu yaradır. Sorğuların və cavabların silinməməsi üçün `DATA_DIR` həmin qovluqlardan **kənarda** olmalıdır.

Yeni Hostinger qovluq quruluşu aşkar edildikdə tətbiq avtomatik:

```text
/home/<istifadəçi>/domains/<domen>/sorgupro-private-data
```

qovluğunu seçir. Hesabınızda bu qovluğa yazma hüququ yoxdursa, hPanel/SSH vasitəsilə yaradın və **Environment Variables**-ə bu yolu daxil edin:

```dotenv
DATA_DIR=/home/<hostinger-istifadəçi>/domains/<domen>/sorgupro-private-data
```

`/home/<...>` real hosting yolunuzla əvəz edilməlidir; bura **nə `hbuilds`, nə də `public_html` daxil olmalıdır**. Hostinger-də başqa kataloq strukturu və ya məhdud fayl yazma icazəsi varsa, `DATA_DIR` mütləq özünüz təyin edin. İlk deploydan sonra `db.json`-un seçilən qalıcı qovluqda yarandığını yoxlayın. Bununla belə, saxlama icazələri və deploylararası sabitlik konkret hosting mühitinizdən asılıdır; canlı məlumatlarla istifadədən əvvəl redeploy sınağı edin.

## 4. Deploy və yoxlama

Deploy bitdikdən sonra aşağıdakıları açın:

```text
https://SIZIN-DOMEN/
https://SIZIN-DOMEN/api/health
```

`/api/health` cavabında `"ok":true` gözlənilir. Girişdə `admin` və yuxarıda təyin etdiyiniz `ADMIN_PASSWORD` istifadə edin. **Production** rejimində nümunə respondentlər, nümunə sorğular və `operator1`/`operator2` hesabları YARADILMIR: real istifadə üçün admin panelindən öz operatorlarınızı və sorğularınızı əlavə edin.

Admin panelində yeni sorğu yaradın → respondent əlavə edin → operator yaradın → sorğunu təyin edin → operatorla daxil olun → cavabı saxlayın. Daha sonra redeploy edərək məlumatların qaldığına əmin olun.

## 5. Ən çox rast gəlinən problemlər

| Problem | Yoxlanmalı |
|---|---|
| `Failed to build` | ZIP kökündə `package.json` və `app.js`, Framework=Other, Node.js=22.x |
| `ADMIN_PASSWORD` xətası | Environment Variables-də ≥12 simvol və standart demo şifrəsindən fərqli şifrə |
| `DATA_DIR ... oxuna/yazıla bilmir` | Səlahiyyət, mövcud qovluq, domenin doğru yolu və fayl yazma icazəsi |
| Giriş uğursuzdur | İlk deployda tətbiq edilən şifrə; `.env` dəyəri sonradan köhnə admin şifrəsini yeniləmir |
| 404/API açılmır | `public/` qovluğunu ayrıca statik sayt kimi deyil, Node.js tətbiqi kimi deploy edin |
| 403 (domen girişində) | Hostinger `public_html/.htaccess` proxysi və deploy loglarını yoxlayın; `.htaccess`-i əl ilə yaratmaq tələb olunmur |
| Yenilənmədən sonra data yoxdur | `DATA_DIR`-in real yolu və həmin yerdə `db.json` olduğunu yoxlayın; əvvəlki bazanın ehtiyatı olmadan yeni dataset istifadə etməyin |

## 6. Vacib istismar qeydləri

- **Məxfilik:** Respondentlərin adları və telefon nömrələri sistemdə saxlanır. Mütləq HTTPS istifadə edin və yalnız səlahiyyətli əməkdaşlara giriş verin.
- **Backup:** `DATA_DIR/db.json` və `DATA_DIR/uploads/` qovluğunun mütəmadi ehtiyatını götürün. Ehtiyat nüsxələrini `public_html`-ə qoymayın.
- **Miqyas:** Mövcud məlumat bazası tək Node.js prosesi üçün fayl əsaslı JSON-dur. Çox operatorlu və kritik istehsalat mühitində MySQL/PostgreSQL kimi tranzaksiyalı məlumat bazasına keçid tövsiyə olunur. Eyni `DATA_DIR`-i birdən çox server prosesi ilə eyni vaxtda işlətməyin.
- **Tətbiq:** Zəng funksiyası operatorun telefonunda `tel:` keçidi açır; sistem özü zəng etmir və telefon danışığını yazmır.
- **Domen:** Mövcud eyni domenli saytınız varsa, yeni veb tətbiq yaratmaq əvvəlki sayta təsir göstərə bilər. Domeni dəyişməzdən əvvəl əvvəlki vebsaytın ehtiyatını götürün.

## 7. Arxivin strukturu

```text
SorguPro_Hostinger_READY.zip
├── package.json        ← Hostinger burada npm konfiqurasiyasını tapır
├── app.js              ← Hostinger entry file
├── .env.example        ← Nümunə; həqiqi şifrələr hPanel-də təyin olunur
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── favicon.svg
├── server/
│   ├── server.js       ← API + statik fayl serveri
│   ├── store.js        ← qalıcı saxlama və Hostinger qovluq tanıma
│   └── seed.js         ← production: yalnız admin; local: demo
├── scripts/
│   └── check-build.js
├── tests/
├── data/
│   └── .gitkeep        ← lokal işə salmada istifadə edilir
├── example_contacts.csv
├── HOSTINGER_QURASDIRMA.md
└── README.md
```

**İstinad (Hostinger):**
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/
