/*
  Warnings:

  - A unique constraint covering the columns `[token_hash]` on the table `account_activation_token` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "account_activation_token_token_hash_key" ON "account_activation_token"("token_hash");
