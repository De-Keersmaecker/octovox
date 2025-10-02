# Perfect Score Reward Settings

## Overzicht

Wanneer een student **alle woorden perfect goed** heeft in **fase 3** tijdens de **eerste ronde**, krijgt hij/zij een beloningsscherm te zien met een filmpje en een bericht.

## Hoe Werkt Het?

### Voorwaarden voor Perfect Score:
1. ✅ Student is in **Fase 3** (typoefening)
2. ✅ Het is de **eerste ronde** door alle woorden
3. ✅ **Alle woorden** zijn **groen** (geen enkele fout)
4. ✅ Geen enkele autocorrectie toegepast

Als aan alle voorwaarden voldaan is:
- 🎉 Beloningsscherm verschijnt
- 📹 Video speelt automatisch af (als geconfigureerd)
- 💬 Aangepast bericht wordt getoond
- ✅ Student kan doorgaan of terug naar dashboard

---

## Reward Settings Configureren

### Via Admin Dashboard:

1. Ga naar `/admin/dashboard`
2. Klik op **"REWARD INSTELLINGEN"**
3. Configureer de volgende settings:

#### Perfect Score Enabled
- **Key**: `perfect_score_enabled`
- **Value**: `true` of `false`
- **Doel**: Schakel het beloningssysteem in/uit

#### Perfect Score Video URL
- **Key**: `perfect_score_video_url`
- **Value**: YouTube video URL (bijvoorbeeld: `https://www.youtube.com/embed/VIDEO_ID`)
- **Doel**: Welke video moet afspelen bij perfect score
- **Tip**: Gebruik een **embed** URL, niet de normale YouTube URL

**Voorbeeld:**
```
❌ Fout: https://www.youtube.com/watch?v=dQw4w9WgXcQ
✅ Goed: https://www.youtube.com/embed/dQw4w9WgXcQ
```

**Kattenfilmpjes voorbeelden:**
```
https://www.youtube.com/embed/J---aiyznGQ  (Cute cats)
https://www.youtube.com/embed/tpiyEe_CqB4  (Funny cats)
https://www.youtube.com/embed/1Pwwx1cF8NQ  (Baby cats)
```

#### Perfect Score Message
- **Key**: `perfect_score_message`
- **Value**: Aangepast bericht (bijv. "Geweldig! Je bent een superster! 🌟")
- **Doel**: Tekst die boven de video verschijnt
- **Default**: "Geweldig! Je hebt alles in één keer goed!"

---

## Voorbeeld Configuratie

### In Database (via SQL):

```sql
-- Enable perfect score rewards
UPDATE reward_settings
SET setting_value = 'true'
WHERE setting_key = 'perfect_score_enabled';

-- Set cat video
UPDATE reward_settings
SET setting_value = 'https://www.youtube.com/embed/J---aiyznGQ'
WHERE setting_key = 'perfect_score_video_url';

-- Custom message
UPDATE reward_settings
SET setting_value = 'Fantastisch! Alle woorden perfect! 🎉🐱'
WHERE setting_key = 'perfect_score_message';
```

### Via Admin UI:

1. Open `/admin/reward-settings`
2. Vul de velden in:
   - **Perfect Score Enabled**: ✅ Aangevinkt
   - **Video URL**: `https://www.youtube.com/embed/J---aiyznGQ`
   - **Message**: `Fantastisch! Alle woorden perfect! 🎉🐱`
3. Klik op **"OPSLAAN"**

---

## Technische Details

### Database Tabel: `reward_settings`

```sql
CREATE TABLE reward_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Default Settings (via migration):

```sql
INSERT INTO reward_settings (setting_key, setting_value, description) VALUES
  ('perfect_score_enabled', 'true', 'Enable perfect score rewards'),
  ('perfect_score_video_url', '', 'YouTube video URL for perfect score reward'),
  ('perfect_score_message', 'Gefeliciteerd! Je hebt alle woorden perfect!', 'Message shown on perfect score')
ON CONFLICT (setting_key) DO NOTHING;
```

---

## Frontend Implementatie

### Practice Page Flow:

1. **Student voltooit eerste ronde in fase 3**
   ```typescript
   if (orangeWords.length === 0 && session?.current_phase === 3) {
     const isPerfectScore = checkForPerfectScore()
     if (isPerfectScore) {
       // Show reward modal, don't continue
     }
   }
   ```

2. **Perfect Score Check**
   ```typescript
   const allGreen = words.every(word => wordStatuses[word.id] === 'green')
   if (allGreen && isFirstRound && session?.current_phase === 3) {
     setShowPerfectScoreReward(true)
     return true
   }
   ```

3. **Reward Modal**
   - Toont titel: "PERFECT SCORE!"
   - Toont custom message
   - Speelt video af (autoplay + unmuted)
   - Biedt knoppen aan:
     - "VERDER GAAN" → Gaat door naar volgende battery/fase
     - "TERUG NAAR DASHBOARD" → Stopt de oefensessie

---

## Video Autoplay

De video speelt **automatisch** af door de autoplay parameter:

```typescript
src={`${videoUrl}?autoplay=1&mute=0`}
```

**Browser requirements:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Voor sommige browsers: gebruiker moet eerder interactie gehad hebben met de pagina

**Fallback:** Als autoplay niet werkt, kan de student de video handmatig starten.

---

## Testen

### Test Scenario 1: Perfect Score
1. Start practice sessie in fase 3
2. Beantwoord alle woorden **perfect correct** in de eerste ronde
3. **Expected:** Beloningsscherm met video
4. Klik "VERDER GAAN"
5. **Expected:** Sessie gaat verder naar volgende battery of eindigt

### Test Scenario 2: Niet Perfect
1. Start practice sessie in fase 3
2. Maak **minstens 1 fout** in de eerste ronde
3. **Expected:** Geen beloningsscherm, normale flow

### Test Scenario 3: Perfect in Fase 1/2
1. Start practice sessie in fase 1 of 2
2. Beantwoord alles perfect
3. **Expected:** Geen beloningsscherm (alleen voor fase 3)

---

## Debugging

### Check Console Logs:

```javascript
console.log('Checking for perfect score:', {
  allGreen,      // Should be true
  isFirstRound,  // Should be true
  phase,         // Should be 3
  wordStatuses   // All should be 'green'
})
```

### Check Reward Settings:

```sql
SELECT * FROM reward_settings;
```

Should return:
```
| setting_key              | setting_value                           |
|--------------------------|-----------------------------------------|
| perfect_score_enabled    | true                                    |
| perfect_score_video_url  | https://www.youtube.com/embed/VIDEO_ID  |
| perfect_score_message    | Custom message here                     |
```

### Common Issues:

**Modal niet verschenen?**
- Check of `perfect_score_enabled` = 'true'
- Check console logs voor perfect score detection
- Verify alle woorden zijn groen (niet orange)
- Verify het is de eerste ronde (niet een herhaling)

**Video speelt niet af?**
- Check of URL een **embed** URL is (niet /watch?v=)
- Check browser console voor errors
- Test video URL apart in een nieuwe tab
- Sommige videos staan embedding niet toe

**Verkeerd bericht?**
- Check `perfect_score_message` in database
- Refresh frontend (cached data)
- Check of frontend de reward settings ophaalt

---

## Future Improvements

Mogelijke uitbreidingen:
- [ ] Verschillende videos per woordenlijst of thema
- [ ] Geluid/muziek bij perfect score
- [ ] Animaties bij het verschijnen van de modal
- [ ] Statistieken bijhouden: hoeveel keer perfect score behaald
- [ ] Badges/achievements voor meerdere perfect scores
- [ ] Selectie uit meerdere beloning videos (random)

---

## API Endpoint

### GET `/api/learning/reward-settings`

Haalt reward settings op voor de frontend.

**Response:**
```json
{
  "perfect_score_enabled": true,
  "perfect_score_video_url": "https://www.youtube.com/embed/VIDEO_ID",
  "perfect_score_message": "Geweldig! Perfect gedaan! 🎉"
}
```

**Usage in frontend:**
```typescript
const response = await fetch(`${API_URL}/learning/reward-settings`)
const settings = await response.json()
setRewardSettings(settings)
```

---

**Veel plezier met de beloningen!** 🎉🐱
