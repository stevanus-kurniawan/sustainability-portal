-- DWS Hub OIDC: store the id_token `sub` as the stable user key (emails can change).
ALTER TABLE "users" ADD COLUMN "oidc_sub" VARCHAR(255);

CREATE UNIQUE INDEX "users_oidc_sub_key" ON "users"("oidc_sub");
