-- { "level": "minimal", "reasons": [] }, NULL when the agent didn't assess it
ALTER TABLE code_reviews ADD COLUMN risk TEXT;
-- { "type": "approved" } or { "type": "skipped", "reason": "..." }, NULL when the template doesn't auto approve
ALTER TABLE code_reviews ADD COLUMN auto_approval TEXT;
-- "open", "merged" or "closed", NULL until the pull request status is fetched
ALTER TABLE code_reviews ADD COLUMN pr_state TEXT;

-- extra rules to assess the risk of merging
ALTER TABLE review_templates ADD COLUMN risk_guidelines TEXT;
-- review requests to the viewer as code owner are reviewed without asking
ALTER TABLE review_templates ADD COLUMN auto_review INTEGER NOT NULL DEFAULT 0;
-- minimal risk reviews are approved without asking
ALTER TABLE review_templates ADD COLUMN auto_approve INTEGER NOT NULL DEFAULT 0;
-- highest risk approved without asking, "minimal", "low" or "medium"
ALTER TABLE review_templates ADD COLUMN auto_approve_max_risk TEXT NOT NULL DEFAULT '"minimal"';
ALTER TABLE review_templates ADD COLUMN require_green_ci INTEGER NOT NULL DEFAULT 1;
