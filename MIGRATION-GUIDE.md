# Database Migration Uitvoeren - Quick Guide

## ✅ Deployment Status
- Code is gepusht naar GitHub
- GitHub Actions deployt automatisch naar Railway
- Migration kan nu uitgevoerd worden via admin UI

---

## 🚀 Migration Uitvoeren (SIMPEL!)

### Stap 1: Wacht tot deployment compleet is
Check GitHub Actions: https://github.com/De-Keersmaecker/octovox/actions

Wacht tot de deployment succesvol is (groene vinkje).

### Stap 2: Open Admin Migrations Page
1. Ga naar: https://octovox-frontend-production.up.railway.app/admin
2. Login met je administrator account
3. Klik op de gele **"DATABASE MIGRATIONS"** knop

### Stap 3: Voer Migration Uit
1. Lees de lijst met fixes die uitgevoerd worden
2. Klik op **"VOER MIGRATION UIT"**
3. Bevestig in de popup
4. Wacht tot de migration compleet is (~5-10 seconden)

### Stap 4: Verificatie
Je zou een groen success bericht moeten zien met:
- ✅ UUID vs INTEGER type conflicten
- ✅ Added missing tables (practice_attempts, practice_sessions, etc.)
- ✅ Added theme column to word_lists
- ✅ Added class_code column to users
- ✅ Updated users role constraint for administrator

---

## 🎯 Wat Gebeurt Er?

De migration voert het volgende uit:

### Schema Fixes
1. **Dropt en herstelt** (met correcte types):
   - `word_statistics` - nu met UUID
   - `class_word_lists` - nu met UUID

2. **Voegt kolommen toe**:
   - `word_lists.theme` (VARCHAR 255)
   - `users.class_code` (VARCHAR 50)
   - Updates `users.role` constraint voor 'administrator'

3. **Creëert nieuwe tabellen**:
   - `practice_attempts` - Individuele woord pogingen
   - `practice_sessions` - 3-fase sessie tracking
   - `word_phase_status` - Per woord fase status
   - `battery_progress` - Battery voortgang tracking
   - `word_attempts` - Gedetailleerde attempt data
   - `upload_sessions` - Excel upload tracking
   - `reward_settings` - Perfect score rewards

4. **Maakt indexes aan** voor performance:
   - `idx_users_class_code`
   - `idx_word_statistics_*`
   - `idx_practice_attempts_*`
   - En meer...

---

## ⚠️ Veiligheid & Rollback

### Is het veilig?
- ✅ **JA** - Migration gebruikt `IF NOT EXISTS` en `IF EXISTS`
- ✅ Kan meerdere keren uitgevoerd worden zonder problemen
- ✅ Dropt alleen tabellen die opnieuw gemaakt worden
- ✅ Voegt alleen kolommen toe die nog niet bestaan

### Wat als het fout gaat?
1. Check de error message in de UI
2. Check backend logs in Railway dashboard
3. Migration kan opnieuw uitgevoerd worden
4. Railway heeft automatische database backups

### Rollback nodig?
Railway maakt automatische backups:
1. Ga naar Railway Dashboard
2. Open PostgreSQL service
3. Klik op "Backups" tab
4. Restore een eerdere backup

---

## 🧪 Test Na Migration

### Test deze functionaliteit:

**1. Registratie**
- [ ] Student kan registreren met class code
- [ ] Class code wordt opgeslagen
- [ ] Student ziet woordenlijsten

**2. Teacher Dashboard**
- [ ] Toont echte student data (geen mock data!)
- [ ] Statistieken kloppen
- [ ] Class filter werkt

**3. Practice Sessie**
- [ ] Geen crashes bij navigeren
- [ ] Autocorrect werkt correct
- [ ] Confirmation dialog bij verlaten

**4. Mobile**
- [ ] Alles responsive op telefoon
- [ ] Grids passen zich aan

---

## 🔧 Troubleshooting

### Migration button niet zichtbaar?
- Check of je ingelogd bent als administrator
- Refresh de pagina
- Check browser console voor errors

### Migration faalt?
**Error: "File not found"**
- Backend kan migration file niet vinden
- Check of `database/fix-schema-conflicts.sql` bestaat in de repo

**Error: "Permission denied"**
- Database user heeft geen rechten
- Check DATABASE_URL in Railway env vars

**Error: "Relation already exists"**
- Migration is al (deels) uitgevoerd
- Dit is OK - migration is idempotent
- Klik nogmaals op uitvoeren

### Deployment succesvol maar migration faalt steeds?
1. Check Railway backend logs: `railway logs --service backend`
2. Check DATABASE_URL: `railway variables --service backend`
3. Test database connectie in Railway SQL console
4. Vraag hulp in Slack/Teams

---

## 📊 Expected Results

Na succesvolle migration zie je in de database:

**Nieuwe tabellen:**
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Moet bevatten:
- battery_progress
- practice_attempts
- practice_sessions
- reward_settings
- upload_sessions
- word_attempts
- word_phase_status
- word_statistics (opnieuw gemaakt)
- class_word_lists (opnieuw gemaakt)

**Nieuwe kolommen:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'class_code';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'word_lists' AND column_name = 'theme';
```

---

## 🎉 Success!

Als alles goed gaat:
- ✅ Migration compleet binnen 10 seconden
- ✅ Groen success bericht in UI
- ✅ Geen errors in backend logs
- ✅ Alle tests slagen
- ✅ App werkt normaal

**De app is nu up-to-date met alle fixes!** 🚀

---

## 📞 Support

Bij problemen:
1. Check DEPLOYMENT.md voor meer details
2. Check GitHub Actions logs
3. Check Railway dashboard logs
4. Test lokaal eerst: `npm run dev`

**Happy Migrating!** 🎊
