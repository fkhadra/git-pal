-- "open", "merged" or "closed", NULL until the pull request status is fetched
ALTER TABLE code_reviews ADD COLUMN pr_state TEXT;
