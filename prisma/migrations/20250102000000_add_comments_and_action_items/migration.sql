-- CreateTable
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ActionItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_noteId_idx" ON "Comment"("noteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActionItem_noteId_idx" ON "ActionItem"("noteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActionItem_userId_idx" ON "ActionItem"("userId");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Comment_noteId_fkey'
    ) THEN
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_noteId_fkey" 
        FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ActionItem_noteId_fkey'
    ) THEN
        ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_noteId_fkey" 
        FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
