-- Since 0063 an account only exists once its address was confirmed, so the
-- flag was true for every row and said nothing.
ALTER TABLE users DROP COLUMN email_verified;
