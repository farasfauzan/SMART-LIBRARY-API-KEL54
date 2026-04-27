import { pool } from '../config/db.js';

export const LoanModel = {
  // Fungsi bawaan modul untuk mencatat peminjaman
  async createLoan(book_id, member_id, due_date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bookCheck = await client.query('SELECT available_copies FROM books WHERE id = $1', [book_id]);
      if (bookCheck.rows[0].available_copies <= 0) {
        throw new Error('Buku sedang tidak tersedia (stok habis).');
      }
      await client.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = $1', [book_id]);
      const loanQuery = `
        INSERT INTO loans (book_id, member_id, due_date) 
        VALUES ($1, $2, $3) RETURNING *
      `;
      const result = await client.query(loanQuery, [book_id, member_id, due_date]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Fungsi bawaan modul untuk melihat semua pinjaman
  async getAllLoans() {
    const query = `
      SELECT l.*, b.title as book_title, m.full_name as member_name 
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // KODE RESPONSI: Mengambil Top 3 Peminjam
  async getTopBorrowers() {
    const query = `
      WITH MemberStats AS (
          SELECT member_id, COUNT(*) as total_loans, MAX(loan_date) as last_loan
          FROM loans GROUP BY member_id
      ),
      FavoriteBook AS (
          SELECT DISTINCT ON (member_id) member_id, b.title
          FROM loans l
          JOIN books b ON l.book_id = b.id
          GROUP BY member_id, b.title
          ORDER BY member_id, COUNT(*) DESC
      )
      SELECT 
          m.*, 
          ms.total_loans as "Total Pinjaman",
          fb.title as "Buku Favorit",
          ms.last_loan as "Pinjaman Terakhir"
      FROM members m
      JOIN MemberStats ms ON m.id = ms.member_id
      LEFT JOIN FavoriteBook fb ON m.id = fb.member_id
      ORDER BY ms.total_loans DESC
      LIMIT 3;
    `;
    const result = await pool.query(query);
    return result.rows;
  }
};