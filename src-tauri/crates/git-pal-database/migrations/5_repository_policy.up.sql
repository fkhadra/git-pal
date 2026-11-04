ALTER TABLE review_templates ADD COLUMN override_repository INTEGER NOT NULL DEFAULT 0;

ALTER TABLE code_reviews ADD COLUMN policy TEXT;
