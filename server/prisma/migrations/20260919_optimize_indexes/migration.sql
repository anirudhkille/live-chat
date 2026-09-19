-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_createdAt_idx" ON "PushSubscription"("userId", "createdAt");

-- DropIndex
DROP INDEX "ConversationParticipant_userId_idx";