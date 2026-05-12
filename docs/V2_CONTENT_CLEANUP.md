# V2 Content Cleanup

Use this only after admins finish re-inputting and re-uploading v2 content, and after business sign-off confirms the new public pages are complete.

## Current Cutover State

- V1 records remain in the database and storage for rollback/audit.
- V2 records are identified by `content_version = 'V2'`.
- V2 files use new `document_versions.file_key` values created from fresh uploads.

## Cleanup Checklist

1. Export v1 rows for archive:
   - `documents` where `content_version = 'V1'`
   - `certifications` where `content_version = 'V1'`
   - `licenses` where `content_version = 'V1'`
   - related `document_versions`, `document_tags`, and audit records as needed
2. Confirm v2 record counts and file previews with business users.
3. Delete or hide v1 rows only after archive approval.
4. Identify MinIO object keys that are referenced only by v1 `document_versions`.
5. Delete old MinIO objects only after confirming no v2 row references the same key.

Do not delete storage objects before deleting/checking database references. The database is the source of truth for which uploaded keys are still in use.
