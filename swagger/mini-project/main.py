#!/usr/bin/env python3
# The OTHER real industry-standard way to do "contract-first" API design:
# instead of hand-writing an openapi.yaml file and validating requests
# against it (the approach used elsewhere in this repo's Node stacks),
# FastAPI generates the OpenAPI spec (and interactive Swagger UI) directly
# FROM your Python type hints and Pydantic models. Both are real,
# widely-used patterns - this is the "code-first" alternative to
# "spec-first," and it's genuinely popular specifically because the docs
# and the validation can never drift apart: they're generated from, and
# enforced by, the exact same models.

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Bookstore API",
    version="1.0.0",
    description="A small inventory API for a bookstore, with a contract generated directly from the code below.",
)


class NewBook(BaseModel):
    title: str = Field(min_length=1)
    author: str = Field(min_length=1)
    price: float = Field(ge=0)
    in_stock: bool = True


class Book(NewBook):
    id: int


books: List[Book] = [
    Book(id=1, title="Clean Code", author="Robert C. Martin", price=34.99, in_stock=True),
    Book(id=2, title="The Pragmatic Programmer", author="Andrew Hunt", price=39.99, in_stock=True),
]
next_id = 3


@app.get("/books", response_model=List[Book])
def list_books():
    return books


@app.post("/books", response_model=Book, status_code=201)
def create_book(new_book: NewBook):
    # No manual validation here - FastAPI already rejected anything that
    # didn't match the NewBook model (missing fields, wrong types, a
    # negative price) with a 422 before this function ever ran.
    global next_id
    book = Book(id=next_id, **new_book.model_dump())
    next_id += 1
    books.append(book)
    return book


@app.get("/books/{book_id}", response_model=Book)
def get_book(book_id: int):
    for book in books:
        if book.id == book_id:
            return book
    raise HTTPException(status_code=404, detail="Book not found")


@app.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: int):
    global books
    if not any(b.id == book_id for b in books):
        raise HTTPException(status_code=404, detail="Book not found")
    books = [b for b in books if b.id != book_id]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4001)
