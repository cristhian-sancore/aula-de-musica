ALTER TABLE "VideoLesson" ALTER COLUMN "moduleId" DROP NOT NULL;
ALTER TABLE "VideoLesson" ADD COLUMN "teacherId" TEXT;
ALTER TABLE "VideoLesson" ADD COLUMN "instrument" TEXT;
ALTER TABLE "VideoLesson" ADD COLUMN "chapter" TEXT;
ALTER TABLE "VideoLesson" ADD CONSTRAINT "VideoLesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
