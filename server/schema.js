async function ensureSchema(pool) {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.flashcard_sets', 'U') IS NULL
    CREATE TABLE dbo.flashcard_sets (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(120) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.questions', 'U') IS NULL
    CREATE TABLE dbo.questions (
      id INT IDENTITY(1,1) PRIMARY KEY,
      set_id INT NOT NULL,
      question_text NVARCHAR(1000) NOT NULL,
      option_a NVARCHAR(500) NOT NULL,
      option_b NVARCHAR(500) NOT NULL,
      option_c NVARCHAR(500) NOT NULL,
      option_d NVARCHAR(500) NOT NULL,
      correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
      explanation NVARCHAR(1500) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_questions_set FOREIGN KEY (set_id)
        REFERENCES dbo.flashcard_sets(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { ensureSchema };