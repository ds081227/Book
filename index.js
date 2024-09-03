import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;
const API_URL = "https://openlibrary.org/search.json";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "testing123",
  port: 5432,
});

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//Home page
app.get("/", async (req, res) => {
  const response = await db.query("SELECT * FROM books ORDER BY id ASC");
  const books = response.rows;
  res.render("index.ejs", { books: books });
});

//Search page
app.get("/search", async (req, res) => {
  res.render("search.ejs");
});

app.get("/add", async (req, res) => {
  res.render("add.ejs");
});

app.post("/search", async (req, res) => {
  const name = formatName(req.body.name);
  const type = req.body.type;
  const results = req.body.results;
  try {
    const result = await axios.get(
      API_URL + `?${type}=${name}&limit=${results}`
    );
    const data = result.data.docs; // Need book title, author name, book id(for cover), first publish year
    const books = data.map((book) => {
      const bookId = book.key.split("/")[2];
      let coverId = book.cover_i ? book.cover_i : "";
      return {
        title: book.title,
        author: book.author_name[0],
        year: book.first_publish_year,
        coverId: coverId,
        bookId: bookId,
      };
    });
    console.log(books);
    res.render("search.ejs", { books: books });
  } catch (error) {
    if (error.response) {
      console.log("Failed to make request:", error.response.status);
    } else {
      console.log("Error:", error);
    }
  }
});

app.post("/add", async (req, res) => {
  const title = req.body.title;
  const author = req.body.author;
  const year = req.body.year;
  const bookId = req.body.bookId;
  const coverId = req.body.coverId;
  const book = {
    title: title,
    author: author,
    year: year,
    bookId: bookId,
    coverId: coverId,
  };

  res.render("add.ejs", { book: book });
});

app.post("/confirm", async (req, res) => {
  const book = req.body;
  const post_time = formatTime();
  await db.query(
    "INSERT INTO books (book_id, cover_id, title, author_name, first_publish_year, rating, review, post_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      book.bookId,
      book.coverId,
      book.title,
      book.author,
      book.year,
      book.rating,
      book.review,
      post_time,
    ]
  );
  res.redirect("/");
});

app.post("/handleBook", async (req, res) => {
  const book_id = req.body.book_id;
  if (req.body.action == "Delete") {
    await db.query("DELETE FROM books where book_id = ($1)", [book_id]);
    res.redirect("/");
  } else if (req.body.action == "Edit") {
    const response = await db.query(
      "SELECT * FROM books WHERE book_id = ($1)",
      [book_id]
    );
    const book = response.rows[0];
    console.log(book);
    res.render("edit.ejs", { book: book });
  }
});

app.post("/update", async (req, res) => {
  const book_id = req.body.book_id;
  const rating = req.body.rating;
  const review = req.body.review;
  const post_time = formatTime();
  await db.query(
    "UPDATE books SET rating = ($1), review = ($2), post_time = ($3) WHERE book_id = ($4)",
    [rating, review, post_time, book_id]
  );
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Reformat the book name for API query
function formatName(name) {
  name = name.replaceAll(" ", "+");
  return name;
}

function formatTime() {
  var date = new Date();
  return (
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1) +
    "-" +
    date.getDate() +
    ", " +
    date.getHours() +
    ":" +
    date.getMinutes()
  );
}
