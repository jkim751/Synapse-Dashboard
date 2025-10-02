-- CreateTable (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Note') THEN
        CREATE TABLE "Note" (
            "id" TEXT NOT NULL,
            "title" TEXT,
            "content" TEXT NOT NULL,
            "author" TEXT NOT NULL,
            "date" TIMESTAMP(3) NOT NULL,
            "userId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX "Note_userId_idx" ON "Note"("userId");
        CREATE INDEX "Note_date_idx" ON "Note"("date");
    END IF;
END $$;

-- CreateTable Comment
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Comment') THEN
        CREATE TABLE "Comment" (
            "id" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "author" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "noteId" TEXT NOT NULL,

            CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX "Comment_noteId_idx" ON "Comment"("noteId");
        
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_noteId_fkey" 
            FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable ActionItem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ActionItem') THEN
        CREATE TABLE "ActionItem" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "author" TEXT NOT NULL,
            "description" TEXT,
            "completed" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "completedAt" TIMESTAMP(3),
            "noteId" TEXT NOT NULL,

            CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX "ActionItem_noteId_idx" ON "ActionItem"("noteId");
        
        ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_noteId_fkey" 
            FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
