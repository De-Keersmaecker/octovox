Projectplan: octovox
Dit document beschrijft de architectuur, het ontwerp en de functionaliteiten van een webapplicatie voor het inoefenen van woordenschat, gebaseerd op de principes van gespreid leren en actieve herinnering met een geavanceerd 3-fasen leersysteem.

1. Concept & Visie
De app "octovox" is een flexibele, minimalistische webapp die leerlingen helpt om specifieke woordenlijsten effectief te memoriseren door een wetenschappelijk onderbouwd 3-fasen leersysteem. De app focust op een heldere, afleidingsvrije interface en een intelligent batterijsysteem met adaptieve revisie.

Kernprincipes:
- Focus: Eén taak tegelijk, geen onnodige afleiding.
- Modulariteit: Leren gebeurt per batterij van 5 woorden in 3 fasen.
- Adaptiviteit: Woorden keren terug tot ze volledig beheerst zijn.
- Motivatie: Directe visuele feedback met groen/oranje kleurcodering.
- Retro Esthetiek: Een minimalistisch zwart-wit design met een monospaced lettertype.

2. Het 3-Fasen Leersysteem

Fase 1: Context Begrijpen (Multiple Choice)
- Leerlingen zien een voorbeeldzin met het woord in context
- Ze kiezen uit 5 multiple choice opties voor de betekenis
- De 5 opties zijn de definities van alle woorden in de huidige batterij
- Bij kleinere batterijen worden 2 extra opties uit vorige batterijen toegevoegd

Fase 2: Woord Plaatsen (Gap-filling met keuzes)
- De voorbeeldzin wordt getoond met het woord vervangen door een lijntje "____"
- Leerlingen kiezen het juiste woord uit een lijst van 5 opties
- De 5 opties zijn alle woorden uit de huidige batterij

Fase 3: Woord Typen (Autocorrect typing)
- De voorbeeldzin wordt getoond met het woord vervangen door een lijntje "____"
- Leerlingen typen het woord in
- AUTOCORRECT FUNCTIE: Bij elke verkeerde letter wordt deze automatisch omgezet naar de juiste letter
- De vraag wordt als fout gerekend, maar de leerling typt uiteindelijk wel het juiste woord
- Geen hints zoals eerste letter of aantal letters

Batterij & Progressiesysteem:
- Elke batterij bevat 5 woorden (of minder bij restwoorden)
- Per fase wordt één batterij tegelijk afgewerkt
- Juist antwoord = GROEN vierkantje
- Fout antwoord = ORANJE vierkantje
- Oranje woorden blijven terugkeren binnen de fase tot ze groen zijn
- Pas als alle woorden in een fase groen zijn, gaat men naar de volgende fase
- Woorden die niet van de eerste keer groen waren in alle fasen keren na 5 batterijen terug in revisiebatterijen
- Na revisiebatterijen komen er eindbatterijen met alle persistente probleemwoorden

3. Rollen & Toegang

Rol: Leerling
Toegang: Eénmalige registratie met naam, e-mailadres, wachtwoord en klascode. Daarna blijft de sessie langdurig (90 dagen) actief op het toestel.

Functionaliteiten:
- Oefent woorden in het 3-fasen systeem per batterij van 5 woorden
- Ziet op het dashboard een overzicht van alle toegewezen lijsten en hun voortgang
- Kan sessies pauzeren en hervatten
- Ontvangt tussentijdse overzichten van oranje woorden
- Toegang tot revisiehistorie (1 jaar bewaard)

Rol: Leerkracht
Toegang: Logt in met een e-mailadres en een speciale lerarencode.

Functionaliteiten:
- Monitort de voortgang van leerlingen per klas en per woordenlijst
- Analyseert welke woorden het moeilijkst zijn per lijst
- Beheert woordenlijsten: creëren, bewerken, verwijderen, en woorden activeren/deactiveren
- Wijst lijsten toe: koppelt specifieke woordenlijsten aan specifieke klassen
- Bekijkt detailstatistieken per fase en per batterij

4. Gebruikerservaring (UX) & Visueel Ontwerp (UI)

Leerling Flow
Dashboard:
- Welkomstboodschap met naam leerling
- Overzicht van toegewezen woordenlijsten
- Per lijst: titel, voortgang in 3 fasen, aantal batterijen per fase
- Knoppen: [Start] of [Hervatten] afhankelijk van status

Batterij Overzicht:
- Huidige fase indicator (1/2/3)
- Grid van vierkantjes die de woorden in de batterij vertegenwoordigen
- Vierkantjes zijn blanco (niet gedaan), groen (juist) of oranje (fout)
- Voortgangsbalk voor huidige batterij
- Batterij counter (bv. "Batterij 3/8 in Fase 1")

Oefenschermen:
Fase 1 (Multiple Choice):
- Voorbeeldzin prominent getoond
- Vraag: "Wat betekent het woord '[woord]' in deze zin?"
- 5 knoppen met verschillende definities
- Onmiddellijke feedback: groen (juist) of oranje (fout)

Fase 2 (Gap-filling):
- Voorbeeldzin met lijntje: "Ik ga ____ naar school."
- Vraag: "Welk woord hoort hier?"
- 5 knoppen met verschillende woorden
- Onmiddellijke feedback

Fase 3 (Autocorrect typing):
- Voorbeeldzin met lijntje
- Invoerveld waar leerling typt
- Real-time autocorrectie (verkeerde letters worden automatisch vervangen)
- Na enter: feedback of het origineel juist of fout was

Tussentijdse Overzichten:
- Na elke batterij: overzicht van groene en oranje woorden
- Optie om door te gaan of te pauzeren
- Overzicht van oranje woorden die nog gedaan moeten worden

5. Database Schema (PostgreSQL) - Uitgebreid

Bestaande tabellen:
- users: id, email, name, password_hash, role
- classes: id, name, class_code, teacher_id
- class_memberships: user_id, class_id
- word_lists: id, title, creator_id
- class_word_list_assignments: class_id, list_id
- words: id, list_id, base_form, definition, example_sentence, is_active

Nieuwe tabellen voor 3-fasen systeem:

learning_sessions:
- id, user_id, list_id, current_phase (1,2,3), current_battery_number
- session_state (active, paused, completed)
- created_at, updated_at, completed_at

battery_progress:
- id, session_id, battery_number, phase, words_in_battery (JSON array van word_ids)
- battery_state (active, completed)
- created_at, completed_at

word_attempts:
- id, session_id, word_id, phase, battery_number, attempt_number
- is_correct, response_given, response_time
- created_at

word_phase_status:
- id, user_id, word_id, phase, status (unseen, green, orange)
- first_attempt_correct, total_attempts, last_attempt_at
- needs_revision (boolean voor revierbatterijen)

revision_queue:
- id, user_id, word_id, list_id, reason (phase_issues, revision_failed)
- priority, created_at, scheduled_for

6. Algoritme & Logica

Batterij Samenstelling:
1. Filter woorden op toegewezen lijsten en is_active: true
2. Bepaal huidige fase (1, 2, of 3) op basis van sessie
3. Voor elke fase: groepeer woorden in batterijen van 5
4. Prioriteer oranje woorden binnen een fase
5. Na 5 batterijen: genereer revisiebatterijen met oranje woorden
6. Na revisie: genereer eindbatterijen met persistent problematische woorden

Autocorrect Logica (Fase 3):
- Real-time monitoring van toetsaanslagen
- Bij verkeerde letter: vervang automatisch door juiste letter
- Houd bij of originele input correct was
- Visuele indicator (tijdelijke rood-groen flash) bij autocorrectie

Progressie Tracking:
- Per woord per fase: groen/oranje status
- Automatische bevordering naar volgende fase als alle woorden groen
- Lange-termijn tracking van moeilijke woorden (1 jaar)

7. Technische Architectuur

Frontend: React (Next.js) met TypeScript
- Real-time autocorrect functionaliteit
- Lokale state management voor batterij progressie
- Optimistic updates voor responsive UX

Styling: Tailwind CSS
- Consistent kleurenschema: groen (#22c55e), oranje (#f97316)
- Retro monospace lettertype
- Responsive grid layouts voor batterij overzichten

Backend: Node.js met Express.js
- RESTful API endpoints voor batterij management
- Real-time sessie synchronisatie
- Complexe algoritmes voor batterij samenstelling en revisie scheduling

Database: PostgreSQL
- Geoptimaliseerd voor frequente updates van word_attempts
- Indexing op user_id, word_id, phase combinaties
- Automatische cleanup van oude revision_queue entries

API Endpoints:
- GET /api/learning/session/:listId - Haal/start sessie op
- POST /api/learning/battery/start - Start nieuwe batterij
- POST /api/learning/attempt - Sla antwoord poging op
- GET /api/learning/battery/overview - Haal batterij status op
- POST /api/learning/session/pause - Pauzeer sessie
- GET /api/learning/revision/queue - Haal revisi woorden op

8. Deployment & Infrastructuur (GitHub & Railway)

Monorepo structuur:
- /frontend (Next.js app)
- /backend (Express.js API)
- /database (PostgreSQL schemas en seeds)

Railway services:
- Frontend service (Next.js deployment)
- Backend service (Node.js API)
- PostgreSQL database service

Environment variabelen:
- Database connecties
- JWT secrets
- CORS configuratie voor productie domains

CI/CD:
- Automatische deployment bij push naar main branch
- Database migraties via backend startup scripts
- Health checks voor alle services