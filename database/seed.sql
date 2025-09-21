-- Seed data for Octovox
-- Sample data for development and testing

-- Insert sample teacher
INSERT INTO users (email, name, password_hash, role, is_verified) VALUES
('teacher@octovox.be', 'Jan Janssen', '$2b$10$dummy.hash.for.development', 'teacher', TRUE);

-- Get the teacher ID for subsequent inserts
-- Note: In a real application, this would be handled by the application logic

-- Insert sample classes
INSERT INTO classes (name, class_code, teacher_id) VALUES
('Klas 3A', 'KL3A2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
('Klas 3B', 'KL3B2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be'));

-- Insert sample students
INSERT INTO users (email, name, password_hash, role, is_verified) VALUES
('student1@octovox.be', 'Emma De Vries', '$2b$10$dummy.hash.for.development', 'student', TRUE),
('student2@octovox.be', 'Lucas Van Der Berg', '$2b$10$dummy.hash.for.development', 'student', TRUE),
('student3@octovox.be', 'Sophie Janssens', '$2b$10$dummy.hash.for.development', 'student', TRUE);

-- Add students to classes
INSERT INTO class_memberships (user_id, class_id) VALUES
((SELECT id FROM users WHERE email = 'student1@octovox.be'), (SELECT id FROM classes WHERE class_code = 'KL3A2024')),
((SELECT id FROM users WHERE email = 'student2@octovox.be'), (SELECT id FROM classes WHERE class_code = 'KL3A2024')),
((SELECT id FROM users WHERE email = 'student3@octovox.be'), (SELECT id FROM classes WHERE class_code = 'KL3B2024'));

-- Insert sample word lists
INSERT INTO word_lists (title, creator_id) VALUES
('Hoofdstuk 1: Basis Woordenschat', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
('Thema: Sport en Beweging', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
('Engels: Daily Routine', (SELECT id FROM users WHERE email = 'teacher@octovox.be'));

-- Insert sample words for "Hoofdstuk 1: Basis Woordenschat"
INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'huis', 'Een gebouw waar mensen wonen', 'Ik woon in een groot huis.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'auto', 'Een voertuig met vier wielen', 'Mijn vader rijdt een blauwe auto.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'school', 'Een plaats waar kinderen leren', 'Ik ga elke dag naar school.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'boek', 'Een verzameling paginas met tekst', 'Ik lees een interessant boek.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'water', 'Een heldere vloeistof die we drinken', 'Ik drink veel water.', TRUE);

-- Insert sample words for "Thema: Sport en Beweging"
INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'voetbal', 'Een sport met een bal en twee teams', 'Ik speel graag voetbal.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'zwemmen', 'Bewegen door het water', 'Ik ga zwemmen in het zwembad.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'rennen', 'Snel bewegen op je benen', 'Ik kan heel snel rennen.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'fietsen', 'Rijden op een fiets', 'Ik ga fietsen naar school.', TRUE);

-- Insert sample words for "Engels: Daily Routine"
INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'wake up', 'opstaan uit bed', 'I wake up at 7 AM every day.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'breakfast', 'de eerste maaltijd van de dag', 'I eat breakfast with my family.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'brush teeth', 'tanden poetsen', 'I brush my teeth before bed.', TRUE),
((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'homework', 'schoolwerk thuis', 'I do my homework after dinner.', TRUE);

-- Assign word lists to classes
INSERT INTO class_word_list_assignments (class_id, list_id) VALUES
((SELECT id FROM classes WHERE class_code = 'KL3A2024'), (SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat')),
((SELECT id FROM classes WHERE class_code = 'KL3A2024'), (SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging')),
((SELECT id FROM classes WHERE class_code = 'KL3B2024'), (SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat')),
((SELECT id FROM classes WHERE class_code = 'KL3B2024'), (SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'));

-- Insert some sample motivational content
INSERT INTO motivational_content (creator_id, type, content_text, is_active) VALUES
((SELECT id FROM users WHERE email = 'teacher@octovox.be'), 'text', 'Geweldig gedaan! Je bent aan het leren!', TRUE),
((SELECT id FROM users WHERE email = 'teacher@octovox.be'), 'text', 'Volhouden! Elke dag een beetje beter!', TRUE),
((SELECT id FROM users WHERE email = 'teacher@octovox.be'), 'text', 'Fantastisch werk! Je hersenen worden sterker!', TRUE),
((SELECT id FROM users WHERE email = 'teacher@octovox.be'), 'text', 'Perfect! Je bent op de goede weg!', TRUE);