Projectplan: octovox
Dit document beschrijft de architectuur, het ontwerp en de functionaliteiten van een webapplicatie voor het inoefenen van woordenschat, gebaseerd op de principes van gespreid leren en actieve herinnering.

1. Concept & Visie
De app "octovox" is een flexibele, minimalistische webapp die leerlingen helpt om specifieke woordenlijsten (bv. een totaal van 800 woorden) effectief te memoriseren. De app focust op een heldere, afleidingsvrije interface, een intelligent leeralgoritme en krachtige beheertools voor leerkrachten om gepersonaliseerde leertrajecten te creëren.

Kernprincipes:

Focus: Eén taak tegelijk, geen onnodige afleiding.

Modulariteit: Leren gebeurt per lijst, wat structuur en overzicht biedt.

Motivatie: Directe zintuiglijke feedback en duidelijke, haalbare doelen per lijst.

Retro Esthetiek: Een minimalistisch zwart-wit design met een monospaced lettertype.

2. Rollen & Toegang
Rol: Leerling
Toegang: Eénmalige registratie met naam, e-mailadres, wachtwoord en klascode. Vereist e-mailactivatie. Daarna blijft de sessie langdurig (90 dagen) actief op het toestel.

Functionaliteiten:

Oefent de woorden van de lijsten die door de leerkracht voor zijn/haar klas zijn geactiveerd.

Ziet op het dashboard een overzicht van alle toegewezen lijsten en de respectievelijke voortgang.

Ontvangt motiverende content.

Rol: Leerkracht
Toegang: Logt in met een e-mailadres en een speciale lerarencode.

Functionaliteiten:

Monitort de voortgang van leerlingen per klas en per woordenlijst.

Analyseert welke woorden het moeilijkst zijn per lijst.

Beheert woordenlijsten: creëren, bewerken, verwijderen, en woorden activeren/deactiveren.

Wijst lijsten toe: koppelt specifieke woordenlijsten aan specifieke klassen.

Beheert de motiverende content.

3. Gebruikerservaring (UX) & Visueel Ontwerp (UI)
Leerling Flow
Login: Simpel en snel, met 'ingelogd blijven' functionaliteit.

Dashboard:

Welkomstboodschap.

Een overzicht van de toegewezen woordenlijsten. Voorbeeld:

"Hoofdstuk 1: Basis" - Voortgangsbalk - [ 150/200 woorden ] - [ Ga verder ]

"Thema: Sport" - Voortgangsbalk - [ 23/50 woorden ] - [ Start ]

Oefenscherm:

Layout: Minimalistisch met voortgangsbalk voor de huidige batterij.

Interactie: Bij het kiezen/invoeren van een antwoord, kleurt de optie/het veld onmiddellijk groen (juist) of rood (fout).

Feedback: Een subtiel geluidje en/of trilling bevestigt een juist (positief) of fout (negatief) antwoord.

Resultatenscherm: Blijft ongewijzigd, toont resultaat per batterij met motiverende content.

Leerkracht Flow
Login: Zoals voorheen.

Dashboard: Overzicht van klassen en een nieuwe hoofdsectie: [ Woordenlijsten Beheren ].

Klasoverzicht:

Selecteer een klas. De weergave toont nu voortgang per leerling en per gekoppelde lijst.

Een knop [ Koppel lijsten aan deze klas ] opent een scherm waar de leerkracht actieve lijsten kan aan- of uitvinken.

Woordenlijst Beheer Interface:

Een overzicht van alle door de leerkracht gemaakte lijsten.

Knoppen: [ + Nieuwe Lege Lijst ] en [ + Importeer Lijst van Excel ].

Door op een lijst te klikken, opent een bewerkscherm:

Een tabel met alle woorden (basisvorm, definitie, voorbeeldzin).

Elke rij heeft een [ Bewerk ] knop en een aan/uit schakelaar om het woord te activeren/deactiveren voor de leerlingen.

De aanpassingen zijn enkel van toepassing op de lijsten van deze leerkracht.

4. Kernlogica & Datastructuur
Database Schema (PostgreSQL) - Aangepast
users: id, email, name, password_hash, role.

classes: id, name, class_code, teacher_id.

class_memberships: user_id, class_id.

word_lists: id, title, creator_id (foreign key naar users.id, om lijsten per leerkracht te isoleren).

class_word_list_assignments: class_id, list_id (koppelt lijsten aan klassen).

words: id, list_id (foreign key), base_form, definition, example_sentence, is_active (boolean, standaard true).

student_progress: user_id, word_id, status, current_phase, times_incorrect, last_practiced.

motivational_content: id, creator_id, type, content_text, content_url.

Algoritme & Logica
Batterij Samenstellen: Het algoritme selecteert woorden voor een leerling door eerst te filteren op:

De woordenlijsten die zijn toegewezen aan de klas van de leerling (class_word_list_assignments).

De woorden binnen die lijsten die is_active: true zijn.

Vervolgens wordt de bekende prioriteit toegepast ('oranje' > 'unseen').

Content Management: De leerkracht beheert de lijsten die gelinkt zijn aan zijn creator_id. Een Excel-import kan een nieuwe lijst aanmaken of een bestaande lijst van die leerkracht bijwerken.

5. Technische Architectuur
Frontend: React (met Next.js)

Styling: Tailwind CSS.

Extra's: Implementatie van de Web Audio API voor geluidseffecten en de Vibration API voor haptische feedback op mobiele toestellen.

Backend: Node.js met Express.js

Libraries: bcrypt, jsonwebtoken, xlsx (of vergelijkbaar).

Database: PostgreSQL

De structuur is nu geoptimaliseerd voor de modulaire opzet met meerdere lijsten.

Authenticatie:

Op maat gemaakt systeem met JWT tokens.

De tokens hebben een lange levensduur (bv. 90 dagen) om de "ingelogd blijven" functionaliteit te waarborgen.

6. Deployment & Infrastructuur (GitHub & Railway)
Deze sectie blijft ongewijzigd. De monorepo-structuur met aparte services voor frontend, backend en database op Railway is perfect voor dit opzet.