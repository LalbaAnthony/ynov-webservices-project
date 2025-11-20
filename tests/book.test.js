jest.mock("../middlewares/requireWriteAccess", () => {
    return (req, res, next) => next();
});

jest.mock("../middlewares/limiter", () => {
    return () => (req, res, next) => next();
});

const request = require("supertest");
const app = require("../app");

jest.mock("../proxies/bookProxy", () => {
    let books = [
        { id: 1, title: "1984", author: "George Orwell" },
        { id: 2, title: "The Hobbit", author: "J.R.R. Tolkien" }
    ];

    return {
        getAll: () => books,
        getById: (id) => books.find(b => b.id === id),
        add: (title, author) => {
            const newBook = { id: books.length + 1, title, author };
            books.push(newBook);
            return newBook;
        },
        update: (id, title, author) => {
            const book = books.find(b => b.id === id);
            if (!book) return null;
            book.title = title;
            book.author = author;
            return book;
        },
        destroy: (id) => {
            const index = books.findIndex(b => b.id === id);
            if (index === -1) return false;
            const deleted = books[index];
            books.splice(index, 1);
            return deleted;
        }
    };
});

describe("BOOKS API", () => {

    test("GET /v1/books returns array", async () => {
        const res = await request(app).get("/v1/books");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("GET /v1/books/:id returns a book", async () => {
        const res = await request(app).get("/v1/books/1");
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe("1984");
    });

    test("GET /v1/books/:id returns 404 for unknown id", async () => {
        const res = await request(app).get("/v1/books/99");
        expect(res.statusCode).toBe(404);
    });

    let createdBookID;
    test("POST /v1/books creates a book", async () => {
        const res = await request(app)
            .post("/v1/books")
            .send({ title: "Dune", author: "Frank Herbert" });

        expect(res.statusCode).toBe(201);
        expect(res.body.title).toBe("Dune");
        expect(res.body.author).toBe("Frank Herbert");

        createdBookID = res.body.id;
    });

    test("GET /v1/books/:id finds the newly created book", async () => {
        const res = await request(app).get(`/v1/books/${createdBookID}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe("Dune");
    });

    test("POST /v1/books returns 400 if missing title or author", async () => {
        const res = await request(app)
            .post("/v1/books")
            .send({ title: "Bad book" });

        expect(res.statusCode).toBe(400);
    });

    test("PUT /v1/books/:id updates a book", async () => {
        const res = await request(app)
            .put("/v1/books/1")
            .send({ title: "Nineteen Eighty-Four", author: "George Orwell" });

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe("Nineteen Eighty-Four");
    });

    test("PUT /v1/books/:id returns 404 for unknown id", async () => {
        const res = await request(app)
            .put("/v1/books/99")
            .send({ title: "Nope", author: "Nobody" });

        expect(res.statusCode).toBe(404);
    });

    test("DELETE /v1/books/:id removes a book", async () => {
        const res = await request(app).delete("/v1/books/1");
        expect(res.statusCode).toBe(200);
    });

    test("GET /v1/books/:id returns 404 after deletion", async () => {
        const res = await request(app).get("/v1/books/1");
        expect(res.statusCode).toBe(404);
    });
});
